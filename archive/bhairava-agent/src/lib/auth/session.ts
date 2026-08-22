import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth/crypto";

/** Separate cookie names so :3000 / :3001 / :3002 sessions never clash on localhost. */
export const ACCESS_COOKIE = "bhairava_agent_access";
export const REFRESH_COOKIE = "bhairava_agent_refresh";

const AGENT_ROLES = new Set(["SALES_AGENT", "SALES_MANAGER"]);

export type SessionUser = AccessTokenPayload & {
  status: "ACTIVE" | "SUSPENDED";
  agentId: string;
};

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    if (!payload.roles.some((r) => AGENT_ROLES.has(r))) return null;

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: {
        status: true,
        agentProfile: { select: { id: true, isActive: true, deletedAt: true } },
      },
    });
    if (!user || user.status !== "ACTIVE") return null;
    if (!user.agentProfile || user.agentProfile.deletedAt || !user.agentProfile.isActive) {
      return null;
    }
    return { ...payload, status: user.status, agentId: user.agentProfile.id };
  } catch {
    return null;
  }
}
