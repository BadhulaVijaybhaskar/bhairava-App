"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import {
  BOOKABLE_PLOT_STATUSES,
  plotStatusForBooking,
} from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

const CREATE_STATUSES: BookingStatus[] = ["RESERVED", "BOOKED"];
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "UPI", "NEFT", "RTGS", "CHEQUE", "CARD", "OTHER"];

async function nextBookingNumber(tx: Prisma.TransactionClient, orgId: string) {
  const year = new Date().getFullYear();
  const prefix = `BK-${year}-`;
  const latest = await tx.booking.findFirst({
    where: { organizationId: orgId, bookingNumber: { startsWith: prefix } },
    orderBy: { bookingNumber: "desc" },
    select: { bookingNumber: true },
  });
  const lastSeq = latest ? Number(latest.bookingNumber.split("-").pop()) : 0;
  const seq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function createBooking(formData: FormData) {
  const session = await requirePermission("bookings", "write");
  if (!session) redirect("/login");

  const projectId = String(formData.get("projectId") || "");
  const plotId = String(formData.get("plotId") || "");
  const customerId = String(formData.get("customerId") || "");
  const agentId = String(formData.get("agentId") || "").trim() || null;
  const bookingDateRaw = String(formData.get("bookingDate") || "");
  const bookingAmount = Number(formData.get("bookingAmount") || 0);
  const discount = Number(formData.get("discount") || 0);
  const notes = String(formData.get("notes") || "").trim();
  const statusRaw = String(formData.get("bookingStatus") || "BOOKED") as BookingStatus;
  const paymentRaw = String(formData.get("paymentMode") || "");
  const bookingStatus = CREATE_STATUSES.includes(statusRaw) ? statusRaw : "BOOKED";
  const paymentMode = PAYMENT_METHODS.includes(paymentRaw as PaymentMethod)
    ? (paymentRaw as PaymentMethod)
    : null;

  if (!projectId || !plotId || !customerId || !bookingDateRaw) {
    redirect("/admin/bookings/new?error=required");
  }
  if (!Number.isFinite(bookingAmount) || bookingAmount < 0 || !Number.isFinite(discount) || discount < 0) {
    redirect("/admin/bookings/new?error=amount");
  }

  const bookingDate = new Date(bookingDateRaw);
  if (Number.isNaN(bookingDate.getTime())) {
    redirect("/admin/bookings/new?error=date");
  }

  const plotStatus = plotStatusForBooking(bookingStatus);
  if (!plotStatus) redirect("/admin/bookings/new?error=status");

  let bookingId = "";
  let projectIdForRevalidate = projectId;
  let plotIdForRevalidate = plotId;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const [project, customer, plot] = await Promise.all([
        tx.project.findFirst({
          where: { id: projectId, organizationId: session.orgId, deletedAt: null },
        }),
        tx.customer.findFirst({
          where: { id: customerId, organizationId: session.orgId, deletedAt: null },
        }),
        tx.plot.findFirst({
          where: { id: plotId, organizationId: session.orgId, deletedAt: null },
        }),
      ]);

      if (!project || !customer || !plot) {
        throw new Error("required");
      }
      if (plot.projectId !== projectId) {
        throw new Error("plotproject");
      }
      if (!BOOKABLE_PLOT_STATUSES.includes(plot.status)) {
        throw new Error("unavailable");
      }

      if (agentId) {
        const agent = await tx.agent.findFirst({
          where: { id: agentId, organizationId: session.orgId, deletedAt: null, isActive: true },
        });
        if (!agent) throw new Error("agent");
      }

      const activeOnPlot = await tx.booking.findFirst({
        where: {
          plotId,
          deletedAt: null,
          bookingStatus: { not: "CANCELLED" },
        },
      });
      if (activeOnPlot) throw new Error("locked");

      const totalPlotPrice = Number(plot.totalPrice);
      const finalAmount = Math.max(totalPlotPrice - discount, 0);
      const bookingNumber = await nextBookingNumber(tx, session.orgId);

      const locked = await tx.plot.updateMany({
        where: {
          id: plotId,
          organizationId: session.orgId,
          deletedAt: null,
          status: { in: BOOKABLE_PLOT_STATUSES },
        },
        data: {
          status: plotStatus,
          assignedCustomerId: customerId,
          assignedAgentId: agentId,
          bookingDate,
          updatedBy: session.sub,
        },
      });
      if (locked.count !== 1) throw new Error("unavailable");

      const created = await tx.booking.create({
        data: {
          organizationId: session.orgId,
          bookingNumber,
          projectId,
          plotId,
          customerId,
          agentId,
          bookingDate,
          bookingAmount,
          paymentMode,
          totalPlotPrice,
          discount,
          finalAmount,
          bookingStatus,
          notes: notes || null,
          createdBy: session.sub,
          updatedBy: session.sub,
        },
      });

      await tx.plotStatusHistory.create({
        data: {
          organizationId: session.orgId,
          plotId,
          fromStatus: plot.status,
          toStatus: plotStatus,
          reason: `Booking ${bookingNumber}`,
          changedBy: session.sub,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          organizationId: session.orgId,
          bookingId: created.id,
          fromStatus: null,
          toStatus: bookingStatus,
          reason: "Booking created",
          changedBy: session.sub,
        },
      });

      return created;
    });

    bookingId = booking.id;
  } catch (err) {
    const code = err instanceof Error ? err.message : "failed";
    const allowed = ["required", "plotproject", "unavailable", "agent", "locked", "amount", "failed"];
    redirect(`/admin/bookings/new?error=${allowed.includes(code) ? code : "failed"}`);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/plots/${plotIdForRevalidate}`);
  revalidatePath(`/admin/projects/${projectIdForRevalidate}`);
  redirect(`/admin/bookings/${bookingId}?saved=1`);
}

export async function updateBookingStatus(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = String(formData.get("id") || "");
  const toStatus = String(formData.get("bookingStatus") || "") as BookingStatus;
  const reason = String(formData.get("reason") || "").trim();

  if (!id || !toStatus) redirect("/admin/bookings");

  try {
    await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id, organizationId: session.orgId, deletedAt: null },
        include: { plot: true },
      });
      if (!booking) throw new Error("missing");
      if (booking.bookingStatus === toStatus) return;

      const plotStatus = plotStatusForBooking(toStatus);

      await tx.booking.update({
        where: { id },
        data: {
          bookingStatus: toStatus,
          updatedBy: session.sub,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          organizationId: session.orgId,
          bookingId: id,
          fromStatus: booking.bookingStatus,
          toStatus,
          reason: reason || `Status → ${toStatus}`,
          changedBy: session.sub,
        },
      });

      if (plotStatus) {
        const plotData: {
          status: typeof plotStatus;
          updatedBy: string;
          assignedCustomerId?: string | null;
          assignedAgentId?: string | null;
          bookingDate?: Date | null;
        } = {
          status: plotStatus,
          updatedBy: session.sub,
        };

        if (toStatus === "CANCELLED") {
          plotData.assignedCustomerId = null;
          plotData.assignedAgentId = null;
          plotData.bookingDate = null;
        }

        await tx.plot.update({
          where: { id: booking.plotId },
          data: plotData,
        });

        await tx.plotStatusHistory.create({
          data: {
            organizationId: session.orgId,
            plotId: booking.plotId,
            fromStatus: booking.plot.status,
            toStatus: plotStatus,
            reason: `Booking ${booking.bookingNumber}: ${toStatus}`,
            changedBy: session.sub,
          },
        });
      }
    });
  } catch {
    redirect(`/admin/bookings/${id}?error=status`);
  }

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "booking.status",
    entityType: "Booking",
    entityId: id,
    metadata: { toStatus },
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/dashboard");
  redirect(`/admin/bookings/${id}?saved=1`);
}

async function nextReceiptNumber(orgId: string) {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;
  const latest = await prisma.payment.findFirst({
    where: { organizationId: orgId, receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });
  const lastSeq = latest?.receiptNumber
    ? Number(latest.receiptNumber.split("-").pop())
    : 0;
  const seq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function recordPayment(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const bookingId = String(formData.get("bookingId") || "");
  const amount = Number(formData.get("amount") || 0);
  const paymentDateRaw = String(formData.get("paymentDate") || "");
  const methodRaw = String(formData.get("paymentMethod") || "UPI") as PaymentMethod;
  const scheduleId = String(formData.get("scheduleId") || "").trim() || null;
  const transactionReference = String(formData.get("transactionReference") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  const paymentMethod = PAYMENT_METHODS.includes(methodRaw) ? methodRaw : "UPI";

  if (!bookingId || !Number.isFinite(amount) || amount <= 0 || !paymentDateRaw) {
    redirect(`/admin/bookings/${bookingId || ""}?error=payment`);
  }

  const paymentDate = new Date(paymentDateRaw);
  if (Number.isNaN(paymentDate.getTime())) {
    redirect(`/admin/bookings/${bookingId}?error=payment`);
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId: session.orgId, deletedAt: null },
  });
  if (!booking) redirect("/admin/bookings");

  if (scheduleId) {
    const schedule = await prisma.paymentSchedule.findFirst({
      where: { id: scheduleId, bookingId, organizationId: session.orgId },
    });
    if (!schedule) redirect(`/admin/bookings/${bookingId}?error=payment`);
  }

  const receiptNumber = await nextReceiptNumber(session.orgId);

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        organizationId: session.orgId,
        bookingId,
        scheduleId,
        amount,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference || null,
        receiptNumber,
        status: "PAID" as PaymentStatus,
        notes: notes || null,
        createdBy: session.sub,
        receipt: {
          create: {
            organizationId: session.orgId,
            receiptNumber,
          },
        },
      },
    });

    if (scheduleId) {
      const schedule = await tx.paymentSchedule.findUnique({ where: { id: scheduleId } });
      if (schedule) {
        const amountPaid = Number(schedule.amountPaid) + amount;
        const balance = Math.max(0, Number(schedule.amountDue) - amountPaid);
        const status: PaymentStatus =
          balance <= 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : schedule.status;
        await tx.paymentSchedule.update({
          where: { id: scheduleId },
          data: { amountPaid, balance, status },
        });
      }
    }

    return p;
  });

  await writeAudit({
    organizationId: session.orgId,
    actorUserId: session.sub,
    action: "payment.record",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { bookingId, amount, receiptNumber },
  });

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/bookings/${bookingId}`);
  redirect(`/admin/bookings/${bookingId}?paymentSaved=1`);
}
