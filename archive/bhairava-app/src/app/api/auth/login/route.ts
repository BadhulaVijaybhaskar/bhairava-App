import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import { checkRateLimit, writeAudit } from "@/lib/audit";
import {
  verifyPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  refreshExpiryDate,
} from "@/lib/auth/crypto";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from "@/lib/auth/session";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);
  const rate = checkRateLimit(`login:${ipAddress}`);
  if (!rate.ok) {
    return jsonError("Too many login attempts. Try again later.", 429, { retryAfterSec: rate.retryAfterSec });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Email/mobile and password are required");
  }

  const identifier = parsed.data.identifier.trim().toLowerCase();
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: isEmail
        ? [{ email: identifier }]
        : [{ mobile: parsed.data.identifier.trim() }, { email: identifier }],
    },
    include: {
      userRoles: { include: { role: true } },
    },
  });

  const fail = async (reason: string, result: "FAILURE" | "SUSPENDED" = "FAILURE") => {
    await prisma.loginAttempt.create({
      data: {
        organizationId: user?.organizationId,
        userId: user?.id,
        identifier: parsed.data.identifier.trim(),
        result,
        ipAddress,
        userAgent,
      },
    });
    await writeAudit({
      organizationId: user?.organizationId,
      actorUserId: user?.id,
      action: "auth.login_failed",
      ipAddress,
      userAgent,
      metadata: { reason },
    });
    return jsonError("Invalid credentials", 401);
  };

  if (!user) return fail("user_not_found");

  const roles = user.userRoles.map((ur) => ur.role.code);
  if (!roles.includes("ADMIN")) return fail("not_admin");

  if (user.status === "SUSPENDED") {
    await prisma.loginAttempt.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        identifier: parsed.data.identifier.trim(),
        result: "SUSPENDED",
        ipAddress,
        userAgent,
      },
    });
    return jsonError("Account suspended. Contact support.", 403);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return fail("bad_password");

  const accessPayload = {
    sub: user.id,
    orgId: user.organizationId,
    roles,
    email: user.email,
    mobile: user.mobile,
    name: user.fullName,
  };

  const accessToken = await signAccessToken(accessPayload);
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: "pending",
      expiresAt: refreshExpiryDate(),
      userAgent,
      ipAddress,
    },
  });
  const refreshJwt = await signRefreshToken(user.id, refreshRecord.id);

  await prisma.refreshToken.update({
    where: { id: refreshRecord.id },
    data: { tokenHash: hashToken(refreshJwt) },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.loginAttempt.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      identifier: parsed.data.identifier.trim(),
      result: "SUCCESS",
      ipAddress,
      userAgent,
    },
  });

  await writeAudit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "auth.login_success",
    ipAddress,
    userAgent,
  });

  const jar = await cookies();
  const accessTtl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 24 * 60 * 60;
  jar.set(ACCESS_COOKIE, accessToken, cookieOptions(accessTtl));
  jar.set(REFRESH_COOKIE, refreshJwt, cookieOptions(refreshTtl));

  return jsonOk({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      roles,
      organizationId: user.organizationId,
    },
  });
}
