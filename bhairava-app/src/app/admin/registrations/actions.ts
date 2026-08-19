"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RegistrationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

const STATUSES: RegistrationStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SCHEDULED",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

export async function updateRegistration(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const statusRaw = String(formData.get("status") || "") as RegistrationStatus;
  const registrationNumber = String(formData.get("registrationNumber") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const scheduledRaw = String(formData.get("scheduledDate") || "").trim();
  const completedRaw = String(formData.get("completedDate") || "").trim();

  if (!id || !STATUSES.includes(statusRaw)) {
    redirect(`/admin/registrations/${id || ""}?error=status`);
  }

  const row = await prisma.registration.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!row) redirect("/admin/registrations");

  const scheduledDate = scheduledRaw ? new Date(scheduledRaw) : null;
  const completedDate =
    statusRaw === "COMPLETED"
      ? completedRaw
        ? new Date(completedRaw)
        : row.completedDate ?? new Date()
      : completedRaw
        ? new Date(completedRaw)
        : null;

  await prisma.registration.update({
    where: { id },
    data: {
      status: statusRaw,
      registrationNumber: registrationNumber || null,
      notes: notes || null,
      scheduledDate:
        scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? scheduledDate : null,
      completedDate:
        completedDate && !Number.isNaN(completedDate.getTime()) ? completedDate : null,
    },
  });

  if (statusRaw === "COMPLETED") {
    await prisma.booking.update({
      where: { id: row.bookingId },
      data: { registrationStatus: "COMPLETED", bookingStatus: "REGISTERED" },
    });
  } else {
    await prisma.booking.update({
      where: { id: row.bookingId },
      data: { registrationStatus: statusRaw },
    });
  }

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "registration.update",
    entityType: "Registration",
    entityId: id,
    metadata: { status: statusRaw },
  });

  revalidatePath("/admin/registrations");
  revalidatePath(`/admin/registrations/${id}`);
  revalidatePath(`/admin/bookings/${row.bookingId}`);
  redirect(`/admin/registrations/${id}?saved=1`);
}
