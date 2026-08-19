"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function createPhase(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim() || null;
  const sequence = Number(formData.get("sequence") || 1);

  if (!projectId || !name) {
    redirect(`/admin/projects/${projectId}?phaseError=required`);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) redirect("/admin/projects");

  await prisma.projectPhase.create({
    data: {
      organizationId: session.orgId,
      projectId,
      name,
      code,
      sequence: Number.isFinite(sequence) ? sequence : 1,
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "phase.create",
    entityType: "ProjectPhase",
    entityId: projectId,
    metadata: { name },
  });

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?phaseSaved=1`);
}

export async function deletePhase(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const phaseId = String(formData.get("phaseId") || "");
  const projectId = String(formData.get("projectId") || "");
  if (!phaseId) redirect(`/admin/projects/${projectId}`);

  const phase = await prisma.projectPhase.findFirst({
    where: { id: phaseId, organizationId: session.orgId, deletedAt: null },
  });
  if (!phase) redirect(`/admin/projects/${projectId}`);

  await prisma.projectPhase.update({
    where: { id: phaseId },
    data: { deletedAt: new Date() },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "phase.delete",
    entityType: "ProjectPhase",
    entityId: phaseId,
  });

  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?phaseDeleted=1`);
}
