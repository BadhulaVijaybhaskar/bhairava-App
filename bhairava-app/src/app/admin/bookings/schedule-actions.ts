"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function createPaymentSchedule(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const bookingId = String(formData.get("bookingId") || "");
  const installmentNumber = Number(formData.get("installmentNumber") || 0);
  const amountDue = Number(formData.get("amountDue") || 0);
  const dueDate = String(formData.get("dueDate") || "");

  if (!bookingId || !(installmentNumber > 0) || !(amountDue > 0) || !dueDate) {
    redirect(`/admin/bookings/${bookingId}?error=schedule`);
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId: session.orgId, deletedAt: null },
  });
  if (!booking) redirect("/admin/bookings");

  const existing = await prisma.paymentSchedule.findFirst({
    where: { bookingId, installmentNumber },
  });
  if (existing) {
    redirect(`/admin/bookings/${bookingId}?error=scheduleDup`);
  }

  await prisma.paymentSchedule.create({
    data: {
      organizationId: session.orgId,
      bookingId,
      installmentNumber,
      dueDate: new Date(dueDate),
      amountDue,
      amountPaid: 0,
      balance: amountDue,
      status: "PENDING",
    },
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "payment_schedule.create",
    entityType: "PaymentSchedule",
    entityId: bookingId,
    metadata: { installmentNumber, amountDue },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  redirect(`/admin/bookings/${bookingId}?scheduleSaved=1`);
}

export async function deletePaymentSchedule(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const scheduleId = String(formData.get("scheduleId") || "");
  const bookingId = String(formData.get("bookingId") || "");
  if (!scheduleId) redirect(`/admin/bookings/${bookingId}`);

  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id: scheduleId, organizationId: session.orgId },
    include: { payments: { where: { deletedAt: null }, take: 1 } },
  });
  if (!schedule) redirect(`/admin/bookings/${bookingId}`);
  if (schedule.payments.length > 0 || Number(schedule.amountPaid) > 0) {
    redirect(`/admin/bookings/${bookingId}?error=schedulePaid`);
  }

  await prisma.paymentSchedule.delete({ where: { id: scheduleId } });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "payment_schedule.delete",
    entityType: "PaymentSchedule",
    entityId: scheduleId,
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  redirect(`/admin/bookings/${bookingId}?scheduleDeleted=1`);
}
