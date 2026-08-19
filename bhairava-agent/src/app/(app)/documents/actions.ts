"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentCategory, DocumentEntityType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { saveDocumentFile } from "@/lib/uploads";

const ALLOWED_AGENT_CATEGORIES = new Set<DocumentCategory>([
  DocumentCategory.BOOKING_FORM,
  DocumentCategory.PAN,
  DocumentCategory.AADHAAR,
  DocumentCategory.ADDRESS_PROOF,
  DocumentCategory.AGREEMENT,
  DocumentCategory.SALE_DEED,
  DocumentCategory.REGISTRATION_COPY,
  DocumentCategory.OTHER,
]);

async function canAccessCustomer(agentId: string, userId: string, customerId: string, orgId: string) {
  const via = await prisma.booking.findFirst({
    where: { agentId, customerId, deletedAt: null },
    select: { id: true },
  });
  if (via) return true;
  const created = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId, createdBy: userId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(created);
}

export async function uploadAgentDocument(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const title = String(formData.get("title") || "").trim();
  const categoryRaw = String(formData.get("category") || "OTHER") as DocumentCategory;
  const customerId = String(formData.get("customerId") || "").trim();
  const plotId = String(formData.get("plotId") || "").trim() || null;
  const bookingId = String(formData.get("bookingId") || "").trim() || null;
  const projectId = String(formData.get("projectId") || "").trim() || null;
  const returnTo = String(formData.get("returnTo") || "/documents");
  const file = formData.get("file");

  const category = ALLOWED_AGENT_CATEGORIES.has(categoryRaw)
    ? categoryRaw
    : DocumentCategory.OTHER;

  if (!title || !customerId || !(file instanceof File) || file.size === 0) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=required`);
  }

  if (!(await canAccessCustomer(session.agentId, session.sub, customerId, session.orgId))) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=forbidden`);
  }

  let saved;
  try {
    saved = await saveDocumentFile(file, session.orgId);
  } catch (e) {
    const code = e instanceof Error ? e.message : "upload";
    redirect(
      `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${
        code === "too_large" || code === "invalid_type" ? code : "upload"
      }`,
    );
  }

  await prisma.document.create({
    data: {
      organizationId: session.orgId,
      entityType: plotId
        ? DocumentEntityType.PLOT
        : bookingId
          ? DocumentEntityType.BOOKING
          : DocumentEntityType.CUSTOMER,
      entityId: plotId || bookingId || customerId,
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

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}uploaded=1`);
}
