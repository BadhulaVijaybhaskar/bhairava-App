import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import {
  verifyPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  refreshExpiryDate,
} from "@/lib/auth/crypto";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  findCustomerForUser,
} from "@/lib/auth/session";

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);

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

  if (!user) return jsonError("Invalid credentials", 401);

  const roles = user.userRoles.map((ur) => ur.role.code);
  if (!roles.includes("CUSTOMER")) {
    return jsonError("Invalid credentials", 401);
  }

  if (user.status === "SUSPENDED") {
    return jsonError("Account suspended. Contact support.", 403);
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return jsonError("Invalid credentials", 401);

  const customer = await findCustomerForUser(user);

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
      customerId: customer?.id ?? null,
      organizationId: user.organizationId,
    },
  });
}
