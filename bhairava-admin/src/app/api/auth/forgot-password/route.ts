import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import { checkRateLimit, writeAudit } from "@/lib/audit";
import { generateRawToken, hashToken } from "@/lib/auth/crypto";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().min(3),
});

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);
  const rate = checkRateLimit(`forgot:${ipAddress}`, 5);
  if (!rate.ok) return jsonError("Too many requests", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Identifier required");

  const identifier = parsed.data.identifier.trim();
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: isEmail
        ? [{ email: identifier.toLowerCase() }]
        : [{ mobile: identifier }, { email: identifier.toLowerCase() }],
    },
  });

  // Always return success to avoid user enumeration
  if (!user) {
    return jsonOk({
      message: "If an account exists, a reset link has been generated.",
    });
  }

  const raw = generateRawToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await writeAudit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "auth.forgot_password",
    ipAddress,
    userAgent,
  });

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${raw}`;

  // Dev: return token/link until email provider is wired
  return jsonOk({
    message: "If an account exists, a reset link has been generated.",
    ...(process.env.NODE_ENV !== "production" ? { resetUrl, token: raw } : {}),
  });
}
