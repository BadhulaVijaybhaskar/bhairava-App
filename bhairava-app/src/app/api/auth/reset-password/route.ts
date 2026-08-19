import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import { checkRateLimit, writeAudit } from "@/lib/audit";
import { hashPassword, hashToken } from "@/lib/auth/crypto";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);
  const rate = checkRateLimit(`reset:${ipAddress}`, 5);
  if (!rate.ok) return jsonError("Too many requests", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Token and password (min 8 chars) required");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashToken(parsed.data.token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return jsonError("Invalid or expired reset token", 400);

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: record.userId } });

  await writeAudit({
    organizationId: user?.organizationId,
    actorUserId: record.userId,
    action: "auth.reset_password",
    ipAddress,
    userAgent,
  });

  return jsonOk({ message: "Password updated. Please log in." });
}
