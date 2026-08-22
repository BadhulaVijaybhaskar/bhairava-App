import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/auth/crypto";

/** Separate cookie names so :3000 / :3001 / :3002 sessions never clash on localhost. */
export const ACCESS_COOKIE = "bhairava_customer_access";
export const REFRESH_COOKIE = "bhairava_customer_refresh";

export type SessionUser = AccessTokenPayload & {
  status: "ACTIVE" | "SUSPENDED";
  customerId: string | null;
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

/** Resolve CRM Customer row by email/mobile (no Customer.userId yet). */
export async function findCustomerForUser(user: {
  organizationId: string;
  email?: string | null;
  mobile?: string | null;
}) {
  const or: Array<{ email?: string; mobile?: string }> = [];
  if (user.email) or.push({ email: user.email });
  if (user.mobile) or.push({ mobile: user.mobile });
  if (or.length === 0) return null;

  return prisma.customer.findFirst({
    where: {
      organizationId: user.organizationId,
      deletedAt: null,
      OR: or,
    },
    select: { id: true },
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyAccessToken(token);
    if (!payload.roles.includes("CUSTOMER")) return null;

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { status: true, organizationId: true, email: true, mobile: true },
    });
    if (!user || user.status !== "ACTIVE") return null;

    const customer = await findCustomerForUser({
      organizationId: user.organizationId,
      email: user.email ?? payload.email,
      mobile: user.mobile ?? payload.mobile,
    });

    return {
      ...payload,
      status: user.status,
      customerId: customer?.id ?? null,
    };
  } catch {
    return null;
  }
}
