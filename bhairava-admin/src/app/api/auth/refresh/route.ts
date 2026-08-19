import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, getClientMeta } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  refreshExpiryDate,
  verifyRefreshToken,
} from "@/lib/auth/crypto";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);
  const jar = await cookies();
  const refreshJwt = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshJwt) return jsonError("No refresh token", 401);

  let payload: { sub: string; jti: string };
  try {
    payload = await verifyRefreshToken(refreshJwt);
  } catch {
    return jsonError("Invalid refresh token", 401);
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      id: payload.jti,
      userId: payload.sub,
      tokenHash: hashToken(refreshJwt),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) return jsonError("Session revoked or expired", 401);

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null, status: "ACTIVE" },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) return jsonError("User not found", 401);

  const roles = user.userRoles.map((ur) => ur.role.code);
  if (!roles.includes("ADMIN")) return jsonError("Forbidden", 403);

  // Rotate refresh token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const newRefresh = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: "pending",
      expiresAt: refreshExpiryDate(),
      userAgent,
      ipAddress,
      replacedById: undefined,
    },
  });

  const newRefreshJwt = await signRefreshToken(user.id, newRefresh.id);
  await prisma.refreshToken.update({
    where: { id: newRefresh.id },
    data: { tokenHash: hashToken(newRefreshJwt), replacedById: undefined },
  });
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { replacedById: newRefresh.id },
  });

  const accessToken = await signAccessToken({
    sub: user.id,
    orgId: user.organizationId,
    roles,
    email: user.email,
    mobile: user.mobile,
    name: user.fullName,
  });

  const accessTtl = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900);
  const refreshTtl = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 24 * 60 * 60;
  jar.set(ACCESS_COOKIE, accessToken, cookieOptions(accessTtl));
  jar.set(REFRESH_COOKIE, newRefreshJwt, cookieOptions(refreshTtl));

  await writeAudit({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "auth.refresh",
    ipAddress,
    userAgent,
  });

  return jsonOk({ refreshed: true });
}
