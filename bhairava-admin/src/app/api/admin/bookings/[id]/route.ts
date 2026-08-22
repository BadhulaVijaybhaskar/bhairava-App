import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const booking = await prisma.booking.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      plot: { select: { id: true, plotNumber: true, status: true } },
      customer: { select: { id: true, fullName: true, mobile: true } },
      agent: { select: { id: true, fullName: true } },
      schedules: { select: { amountDue: true, status: true } },
      payments: {
        where: { deletedAt: null },
        select: { amount: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const paid = booking.payments.reduce((s, p) => s + Number(p.amount), 0);
  const scheduled = booking.schedules.reduce((s, p) => s + Number(p.amountDue), 0);
  const finalAmount = Number(booking.finalAmount);
  const progressTarget = scheduled > 0 ? scheduled : finalAmount;
  const progressPct =
    progressTarget > 0 ? Math.min(100, Math.round((paid / progressTarget) * 100)) : 0;

  return NextResponse.json({
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.bookingStatus,
    statusLabel: BOOKING_STATUS_LABELS[booking.bookingStatus],
    bookingDate: booking.bookingDate.toISOString(),
    finalAmount,
    bookingAmount: Number(booking.bookingAmount),
    discount: Number(booking.discount),
    notes: booking.notes,
    project: booking.project,
    plot: booking.plot,
    customer: booking.customer,
    agent: booking.agent,
    paid,
    scheduled,
    progressPct,
  });
}
