import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { jsonOk, getClientMeta } from "@/lib/api";
import { hashToken, verifyAccessToken } from "@/lib/auth/crypto";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from "@/lib/auth/session";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  getClientMeta(req);
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  if (jar.get(ACCESS_COOKIE)?.value) {
    try {
      await verifyAccessToken(jar.get(ACCESS_COOKIE)!.value);
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

  return jsonOk({ loggedOut: true });
}
