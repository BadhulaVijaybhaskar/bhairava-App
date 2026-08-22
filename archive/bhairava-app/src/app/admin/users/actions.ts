"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/crypto";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function toggleUserStatus(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  if (!id || id === session.sub) redirect("/admin/users");

  const user = await prisma.user.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!user) redirect("/admin/users");

  const next = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({
    where: { id },
    data: { status: next },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: next === "ACTIVE" ? "user.activate" : "user.suspend",
    entityType: "User",
    entityId: id,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const mobile = String(formData.get("mobile") || "").trim().replace(/\s+/g, "");
  const password = String(formData.get("password") || "");
  const roleId = String(formData.get("roleId") || "").trim();

  if (!fullName || !email || !password || password.length < 8) {
    redirect("/admin/users/new?error=required");
  }
  if (mobile && !/^\d{10}$/.test(mobile)) {
    redirect("/admin/users/new?error=mobile");
  }

  const dup = await prisma.user.findFirst({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      OR: [{ email }, ...(mobile ? [{ mobile }] : [])],
    },
  });
  if (dup) redirect("/admin/users/new?error=duplicate");

  if (roleId) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId: session.orgId }, { organizationId: null }],
      },
    });
    if (!role) redirect("/admin/users/new?error=role");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      organizationId: session.orgId,
      fullName,
      email,
      mobile: mobile || null,
      passwordHash,
      status: "ACTIVE",
      createdBy: session.sub,
      ...(roleId
        ? {
            userRoles: {
              create: { roleId },
            },
          }
        : {}),
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "user.create",
    entityType: "User",
    entityId: user.id,
    metadata: { email, roleId: roleId || null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function setUserRole(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = String(formData.get("userId") || "");
  const roleId = String(formData.get("roleId") || "").trim();

  if (!userId) redirect("/admin/users");

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: session.orgId, deletedAt: null },
  });
  if (!user) redirect("/admin/users");

  if (roleId) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId: session.orgId }, { organizationId: null }],
      },
    });
    if (!role) redirect("/admin/users?error=role");
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    ...(roleId
      ? [prisma.userRole.create({ data: { userId, roleId } })]
      : []),
  ]);

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "user.role",
    entityType: "User",
    entityId: userId,
    metadata: { roleId: roleId || null },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}
