"use server";

import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Module.action permission check. ADMIN always passes.
 * Other roles must have matching RolePermission rows (seeded for ADMIN only today).
 */
export async function requirePermission(module: string, action: "read" | "write") {
  const session = await getSession();
  if (!session) return null;
  if (session.roles.includes("ADMIN")) return session;

  const code = `${module}.${action}`;
  const hit = await prisma.userRole.findFirst({
    where: {
      userId: session.sub,
      role: {
        rolePermissions: {
          some: { permission: { code } },
        },
      },
    },
    select: { id: true },
  });
  return hit ? session : null;
}

export async function getAccessCookiePresent() {
  const jar = await cookies();
  return Boolean(jar.get("bhairava_access")?.value);
}
