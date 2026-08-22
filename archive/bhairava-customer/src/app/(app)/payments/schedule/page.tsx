import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { StatusBadge } from "@/components/mobile/status-badge";

export default async function PaymentSchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.customerId) redirect("/payments");

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      organizationId: session.orgId,
      booking: { customerId: session.customerId, deletedAt: null },
    },
    orderBy: [{ bookingId: "asc" }, { installmentNumber: "asc" }],
  });

  const nextDue = schedules.find((s) => Number(s.balance) > 0);

  return (
    <div>
      <MobileHeader title="Payment Schedule" backHref="/payments" />

      {schedules.length === 0 ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">
          No payment schedule yet
        </div>
      ) : (
        <div className="m-card px-3">
          {schedules.map((s) => {
            const status =
              Number(s.balance) <= 0
                ? "Paid"
                : s.dueDate.getTime() < Date.now()
                  ? "Pending"
                  : "Upcoming";
            return (
              <div key={s.id} className="list-row">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">
                    {s.installmentNumber === 1
                      ? "Booking Amount"
                      : `Installment #${s.installmentNumber}`}
                  </p>
                  <p className="text-[11px] text-[var(--muted)]">
                    Due{" "}
                    {s.dueDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold">{formatINR(Number(s.amountDue))}</p>
                  <StatusBadge status={status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {nextDue ? (
        <div className="m-card mt-4 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[var(--muted)]">Next Due</p>
              <p className="text-[12px] text-[var(--muted)]">
                {nextDue.dueDate.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="mt-1 text-[18px] font-bold text-[var(--ink)]">
                {formatINR(Number(nextDue.balance))}
              </p>
            </div>
          </div>
          <button type="button" className="m-btn mt-3" disabled title="Online pay coming soon">
            Pay Now
          </button>
          <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
            Contact office to record payment — online pay coming soon.
          </p>
        </div>
      ) : null}
    </div>
  );
}
