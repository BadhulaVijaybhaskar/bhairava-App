import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
  nextBookingStatuses,
} from "@/lib/bookings";
import { formatIndianDate, formatIndianDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/ui/flash-toast";
import { recordPayment, updateBookingStatus } from "../actions";
import { createPaymentSchedule, deletePaymentSchedule } from "../schedule-actions";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
    paymentSaved?: string;
    scheduleSaved?: string;
    scheduleDeleted?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const booking = await prisma.booking.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, code: true } },
      plot: { select: { id: true, plotNumber: true, status: true } },
      customer: { select: { id: true, fullName: true, mobile: true, email: true } },
      agent: { select: { id: true, fullName: true, mobile: true } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 12 },
      schedules: { orderBy: { installmentNumber: "asc" } },
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: "desc" },
        take: 20,
      },
    },
  });

  if (!booking) notFound();

  const transitions = nextBookingStatuses(booking.bookingStatus);
  const paidTotal = booking.payments.reduce((s, p) => s + Number(p.amount), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-1 py-1">
        <Link href="/admin/bookings" className="rounded-lg p-2 text-primary hover:bg-canvas">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{booking.bookingNumber}</p>
          <p className="text-xs text-muted-foreground">
            {booking.plot.plotNumber} · {booking.project.name}
          </p>
        </div>
        <span className={cn("status-pill", BOOKING_STATUS_STYLES[booking.bookingStatus])}>
          {BOOKING_STATUS_LABELS[booking.bookingStatus]}
        </span>
      </div>

      {sp.saved === "1" ? <FlashToast message="Booking updated." /> : null}
      {sp.paymentSaved === "1" ? <FlashToast message="Payment recorded." /> : null}
      {sp.scheduleSaved === "1" ? <FlashToast message="Installment added." /> : null}
      {sp.scheduleDeleted === "1" ? <FlashToast message="Installment removed." /> : null}
      {sp.error === "status" ? (
        <FlashToast variant="error" message="Could not update status." />
      ) : null}
      {sp.error === "payment" ? (
        <FlashToast variant="error" message="Enter a valid payment amount and date." />
      ) : null}
      {sp.error === "schedule" ? (
        <FlashToast variant="error" message="Enter installment number, amount, and due date." />
      ) : null}
      {sp.error === "scheduleDup" ? (
        <FlashToast variant="error" message="That installment number already exists." />
      ) : null}
      {sp.error === "schedulePaid" ? (
        <FlashToast variant="error" message="Cannot delete an installment with payments." />
      ) : null}

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Customer</span>
          <Link href={`/admin/customers/${booking.customer.id}`} className="font-semibold text-primary">
            {booking.customer.fullName}
          </Link>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Agent</span>
          {booking.agent ? (
            <Link href={`/admin/agents/${booking.agent.id}`} className="font-semibold text-primary">
              {booking.agent.fullName}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">—</span>
          )}
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Final amount</span>
          <span className="font-bold text-foreground">{formatINR(Number(booking.finalAmount))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Collected</span>
          <span className="font-bold text-emerald-700">{formatINR(paidTotal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Booking date</span>
          <span className="font-semibold text-foreground">{formatIndianDate(booking.bookingDate)}</span>
        </div>
      </div>

      {booking.bookingStatus !== "CANCELLED" ? (
        <form action={createPaymentSchedule} className="surface space-y-3 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Add payment installment
          </p>
          <input type="hidden" name="bookingId" value={booking.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-foreground">
              # 
              <input
                name="installmentNumber"
                type="number"
                min={1}
                required
                defaultValue={booking.schedules.length + 1}
                className="input-field mt-1 !pl-3"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Amount (₹)
              <input
                name="amountDue"
                type="number"
                min={1}
                step="1"
                required
                className="input-field mt-1 !pl-3"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Due date
              <input
                name="dueDate"
                type="date"
                required
                defaultValue={today}
                className="input-field mt-1 !pl-3"
              />
            </label>
          </div>
          <button type="submit" className="btn-primary px-5 py-2.5">
            Add installment
          </button>
        </form>
      ) : null}

      {booking.schedules.length > 0 ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Payment schedule
          </p>
          <ul className="space-y-0">
            {booking.schedules.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-foreground">
                    #{s.installmentNumber} · {formatINR(Number(s.amountDue))}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Due {formatIndianDate(s.dueDate)} · paid {formatINR(Number(s.amountPaid))} · bal{" "}
                    {formatINR(Number(s.balance))} · {s.status}
                  </p>
                </div>
                {Number(s.amountPaid) === 0 ? (
                  <form action={deletePaymentSchedule}>
                    <input type="hidden" name="scheduleId" value={s.id} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" className="text-xs font-semibold text-red-600">
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {booking.bookingStatus !== "CANCELLED" ? (
        <form action={recordPayment} className="surface space-y-3 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Record payment
          </p>
          <input type="hidden" name="bookingId" value={booking.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-foreground">
              Amount (₹)
              <input
                name="amount"
                type="number"
                min={1}
                step="1"
                required
                className="input-field mt-1 !pl-3"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Date
              <input
                name="paymentDate"
                type="date"
                required
                defaultValue={today}
                className="input-field mt-1 !pl-3"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Method
              <select name="paymentMethod" className="input-field mt-1 !pl-3" defaultValue="UPI">
                {["CASH", "UPI", "NEFT", "RTGS", "CHEQUE", "CARD", "OTHER"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Installment (optional)
              <select name="scheduleId" className="input-field mt-1 !pl-3" defaultValue="">
                <option value="">None / token</option>
                {booking.schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.installmentNumber} · bal {formatINR(Number(s.balance))}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground sm:col-span-2">
              Reference
              <input
                name="transactionReference"
                className="input-field mt-1 !pl-3"
                placeholder="UPI / cheque / UTR"
              />
            </label>
          </div>
          <button type="submit" className="btn-primary px-5 py-2.5">
            Save payment
          </button>
        </form>
      ) : null}

      {booking.payments.length > 0 ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Payments
          </p>
          <ul className="space-y-0">
            {booking.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-foreground">
                    {formatINR(Number(p.amount))}
                    <span className="ml-2 text-xs font-medium text-muted-foreground">{p.paymentMethod}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatIndianDate(p.paymentDate)}
                    {p.receiptNumber ? ` · ${p.receiptNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/payments/${p.id}/receipt`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Receipt
                  </Link>
                  <span className="status-pill bg-emerald-100 text-emerald-800">{p.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {booking.bookingStatus !== "CANCELLED" && transitions.length > 0 ? (
        <form action={updateBookingStatus} className="surface space-y-3 p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Update status
          </p>
          <input type="hidden" name="id" value={booking.id} />
          <label className="block text-sm font-semibold text-foreground">
            New status
            <select
              name="bookingStatus"
              required
              className="input-field mt-1 !pl-3"
              defaultValue={transitions[0]}
            >
              {transitions.map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Reason (optional)
            <input name="reason" className="input-field mt-1 !pl-3" />
          </label>
          <button type="submit" className="btn-primary px-5 py-2.5">
            Save status
          </button>
        </form>
      ) : null}

      {booking.statusHistory.length > 0 ? (
        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Status history
          </p>
          <ul className="space-y-0">
            {booking.statusHistory.map((h) => (
              <li key={h.id} className="py-2.5 text-sm">
                <p className="font-semibold text-foreground">
                  {h.fromStatus ? BOOKING_STATUS_LABELS[h.fromStatus] : "—"} →{" "}
                  {BOOKING_STATUS_LABELS[h.toStatus]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatIndianDateTime(h.createdAt)}
                  {h.reason ? ` · ${h.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
