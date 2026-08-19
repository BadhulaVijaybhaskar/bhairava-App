"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResaleStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const STATUSES: ResaleStatus[] = ["LISTED", "UNDER_OFFER", "SOLD", "WITHDRAWN"];

export async function createResaleListing(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const plotId = String(formData.get("plotId") || "");
  const askingPrice = Number(formData.get("askingPrice") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const statusRaw = String(formData.get("status") || "LISTED") as ResaleStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : "LISTED";

  if (!plotId || !Number.isFinite(askingPrice) || askingPrice <= 0) {
    redirect("/admin/resale/new?error=required");
  }

  const plot = await prisma.plot.findFirst({
    where: { id: plotId, organizationId: session.orgId, deletedAt: null },
  });
  if (!plot) redirect("/admin/resale/new?error=plot");

  const existing = await prisma.resaleListing.findFirst({
    where: { organizationId: session.orgId, plotId, deletedAt: null },
  });
  if (existing) redirect(`/admin/resale/${existing.id}?error=exists`);

  const listing = await prisma.resaleListing.create({
    data: {
      organizationId: session.orgId,
      projectId: plot.projectId,
      plotId: plot.id,
      askingPrice,
      status,
      notes: notes || null,
    },
  });

  await prisma.plot.update({
    where: { id: plot.id },
    data: {
      status: status === "WITHDRAWN" ? plot.status : "RESALE_AVAILABLE",
      resaleStatus: status !== "WITHDRAWN" && status !== "SOLD",
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "resale.create",
    entityType: "ResaleListing",
    entityId: listing.id,
  });

  revalidatePath("/admin/resale");
  revalidatePath("/admin/plots");
  redirect(`/admin/resale/${listing.id}?saved=1`);
}

export async function updateResaleListing(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const askingPrice = Number(formData.get("askingPrice") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const statusRaw = String(formData.get("status") || "LISTED") as ResaleStatus;
  const status = STATUSES.includes(statusRaw) ? statusRaw : "LISTED";

  if (!id || !Number.isFinite(askingPrice) || askingPrice <= 0) {
    redirect(`/admin/resale/${id || ""}?error=required`);
  }

  const listing = await prisma.resaleListing.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!listing) redirect("/admin/resale");

  await prisma.resaleListing.update({
    where: { id },
    data: {
      askingPrice,
      status,
      notes: notes || null,
    },
  });

  await prisma.plot.update({
    where: { id: listing.plotId },
    data: {
      status:
        status === "SOLD"
          ? "SOLD"
          : status === "WITHDRAWN"
            ? "REGISTERED"
            : "RESALE_AVAILABLE",
      resaleStatus: status === "LISTED" || status === "UNDER_OFFER",
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "resale.update",
    entityType: "ResaleListing",
    entityId: id,
    metadata: { status },
  });

  revalidatePath("/admin/resale");
  revalidatePath(`/admin/resale/${id}`);
  redirect(`/admin/resale/${id}?saved=1`);
}
