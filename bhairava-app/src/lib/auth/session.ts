import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth/crypto";

export const ACCESS_COOKIE = "bhairava_access";
export const REFRESH_COOKIE = "bhairava_refresh";

export type SessionUser = AccessTokenPayload & {
  status: "ACTIVE" | "SUSPENDED";
};

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

export function getAccessTokenFromRequest(req: NextRequest): string | null {
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie) return cookie;
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { status: true },
    });
    if (!user || user.status !== "ACTIVE") return null;
    if (!payload.roles.includes("ADMIN")) return null;
    return { ...payload, status: user.status };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
