"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

function readAgentFields(formData: FormData) {
  const fullName = String(formData.get("fullName") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim().replace(/\s+/g, "");
  const email = String(formData.get("email") || "").trim();
  const employeeCode = String(formData.get("employeeCode") || "").trim();
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const projectIds = formData
    .getAll("projectIds")
    .map((v) => String(v))
    .filter(Boolean);

  return { fullName, mobile, email, employeeCode, isActive, projectIds };
}

export async function createAgent(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { fullName, mobile, email, employeeCode, isActive, projectIds } = readAgentFields(formData);

  if (!fullName || !mobile) {
    redirect("/admin/agents/new?error=required");
  }

  if (!/^\d{10}$/.test(mobile)) {
    redirect("/admin/agents/new?error=mobile");
  }

  const existing = await prisma.agent.findFirst({
    where: { organizationId: session.orgId, mobile, deletedAt: null },
  });
  if (existing) {
    redirect("/admin/agents/new?error=duplicate");
  }

  if (projectIds.length > 0) {
    const validCount = await prisma.project.count({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        id: { in: projectIds },
      },
    });
    if (validCount !== projectIds.length) {
      redirect("/admin/agents/new?error=projects");
    }
  }

  const agent = await prisma.agent.create({
    data: {
      organizationId: session.orgId,
      fullName,
      mobile,
      email: email || null,
      employeeCode: employeeCode || null,
      isActive,
      projects: {
        create: projectIds.map((projectId) => ({ projectId })),
      },
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "agent.create",
    entityType: "Agent",
    entityId: agent.id,
  });

  revalidatePath("/admin/agents");
  redirect(`/admin/agents/${agent.id}?saved=1`);
}

export async function updateAgent(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const { fullName, mobile, email, employeeCode, isActive, projectIds } = readAgentFields(formData);

  if (!id || !fullName || !mobile) {
    redirect(`/admin/agents/${id || ""}/edit?error=required`);
  }

  if (!/^\d{10}$/.test(mobile)) {
    redirect(`/admin/agents/${id}/edit?error=mobile`);
  }

  const agent = await prisma.agent.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!agent) redirect("/admin/agents");

  const duplicate = await prisma.agent.findFirst({
    where: {
      organizationId: session.orgId,
      mobile,
      deletedAt: null,
      NOT: { id },
    },
  });
  if (duplicate) {
    redirect(`/admin/agents/${id}/edit?error=duplicate`);
  }

  if (projectIds.length > 0) {
    const validCount = await prisma.project.count({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        id: { in: projectIds },
      },
    });
    if (validCount !== projectIds.length) {
      redirect(`/admin/agents/${id}/edit?error=projects`);
    }
  }

  await prisma.$transaction([
    prisma.agent.update({
      where: { id },
      data: {
        fullName,
        mobile,
        email: email || null,
        employeeCode: employeeCode || null,
        isActive,
      },
    }),
    prisma.agentProjectAssignment.deleteMany({ where: { agentId: id } }),
    ...(projectIds.length
      ? [
          prisma.agentProjectAssignment.createMany({
            data: projectIds.map((projectId) => ({ agentId: id, projectId })),
          }),
        ]
      : []),
  ]);

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "agent.update",
    entityType: "Agent",
    entityId: id,
  });

  revalidatePath("/admin/agents");
  revalidatePath(`/admin/agents/${id}`);
  revalidatePath(`/admin/agents/${id}/edit`);
  redirect(`/admin/agents/${id}?saved=1`);
}
