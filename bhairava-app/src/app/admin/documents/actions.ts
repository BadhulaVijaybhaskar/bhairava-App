"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentCategory, DocumentEntityType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { saveDocumentFile } from "@/lib/uploads";

const CATEGORIES = new Set(Object.values(DocumentCategory));
const ENTITIES = new Set(Object.values(DocumentEntityType));

export async function uploadDocument(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  const categoryRaw = String(formData.get("category") || "OTHER");
  const entityTypeRaw = String(formData.get("entityType") || "ORGANIZATION");
  const entityId = String(formData.get("entityId") || "").trim();
  const file = formData.get("file");

  const category = CATEGORIES.has(categoryRaw as DocumentCategory)
    ? (categoryRaw as DocumentCategory)
    : DocumentCategory.OTHER;
  const entityType = ENTITIES.has(entityTypeRaw as DocumentEntityType)
    ? (entityTypeRaw as DocumentEntityType)
    : DocumentEntityType.ORGANIZATION;

  if (!title || !(file instanceof File) || file.size === 0) {
    redirect("/admin/documents?error=required");
  }

  let saved;
  try {
    saved = await saveDocumentFile(file, session.orgId);
  } catch (e) {
    const code = e instanceof Error ? e.message : "upload";
    redirect(`/admin/documents?error=${code === "too_large" || code === "invalid_type" ? code : "upload"}`);
  }

  let projectId: string | null = null;
  let plotId: string | null = null;
  let customerId: string | null = null;
  let bookingId: string | null = null;
  let resolvedEntityId = entityId || session.orgId;

  if (entityType === "CUSTOMER" && entityId) {
    const c = await prisma.customer.findFirst({
      where: { id: entityId, organizationId: session.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!c) redirect("/admin/documents?error=entity");
    customerId = c.id;
    resolvedEntityId = c.id;
  } else if (entityType === "PROJECT" && entityId) {
    const p = await prisma.project.findFirst({
      where: { id: entityId, organizationId: session.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!p) redirect("/admin/documents?error=entity");
    projectId = p.id;
    resolvedEntityId = p.id;
  } else if (entityType === "PLOT" && entityId) {
    const p = await prisma.plot.findFirst({
      where: { id: entityId, organizationId: session.orgId, deletedAt: null },
      select: { id: true, projectId: true },
    });
    if (!p) redirect("/admin/documents?error=entity");
    plotId = p.id;
    projectId = p.projectId;
    resolvedEntityId = p.id;
  } else if (entityType === "BOOKING" && entityId) {
    const b = await prisma.booking.findFirst({
      where: { id: entityId, organizationId: session.orgId, deletedAt: null },
      select: { id: true, projectId: true, plotId: true, customerId: true },
    });
    if (!b) redirect("/admin/documents?error=entity");
    bookingId = b.id;
    projectId = b.projectId;
    plotId = b.plotId;
    customerId = b.customerId;
    resolvedEntityId = b.id;
  } else if (entityType === "ORGANIZATION") {
    resolvedEntityId = session.orgId;
  }

  const doc = await prisma.document.create({
    data: {
      organizationId: session.orgId,
      entityType,
      entityId: resolvedEntityId,
      category,
      title,
      projectId,
      plotId,
      customerId,
      bookingId,
      currentVersion: 1,
      createdBy: session.sub,
      versions: {
        create: {
          versionNumber: 1,
          storagePath: saved.publicPath,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          uploadedBy: session.sub,
        },
      },
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "document.upload",
    entityType: "Document",
    entityId: doc.id,
    metadata: { title, category, entityType },
  });

  revalidatePath("/admin/documents");
  if (customerId) revalidatePath(`/admin/customers/${customerId}`);
  redirect("/admin/documents?saved=1");
}
