import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonOk, getClientMeta } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { hashToken } from "@/lib/auth/crypto";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions, getAccessTokenFromCookies } from "@/lib/auth/session";
import { verifyAccessToken } from "@/lib/auth/crypto";

export async function POST(req: NextRequest) {
  const { ipAddress, userAgent } = getClientMeta(req);
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  const access = await getAccessTokenFromCookies();

  let userId: string | undefined;
  let orgId: string | undefined;

  if (access) {
    try {
      const payload = await verifyAccessToken(access);
      userId = payload.sub;
      orgId = payload.orgId;
    } catch {
      /* ignore */
    }
  }

  if (refresh) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  jar.set(ACCESS_COOKIE, "", cookieOptions(0));
  jar.set(REFRESH_COOKIE, "", cookieOptions(0));

  await writeAudit({
    organizationId: orgId,
    actorUserId: userId,
    action: "auth.logout",
    ipAddress,
    userAgent,
  });

  return jsonOk({ loggedOut: true });
}
