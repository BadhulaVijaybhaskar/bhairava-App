import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { StatusBadge } from "@/components/mobile/status-badge";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!session.customerId) {
    return (
      <div>
        <MobileHeader title="Payments" backHref="/dashboard" />
        <div className="m-card p-4 text-[13px] text-[var(--muted)]">No customer profile linked.</div>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.customerId, deletedAt: null },
    include: {
      payments: { where: { deletedAt: null }, orderBy: { paymentDate: "asc" } },
      schedules: { orderBy: { installmentNumber: "asc" } },
    },
  });

  const totalPrice = bookings.reduce((s, b) => s + Number(b.finalAmount), 0);
  const totalPaid = bookings.reduce(
    (s, b) => s + b.payments.reduce((ps, p) => ps + Number(p.amount), 0),
    0,
  );
  const pending = Math.max(0, totalPrice - totalPaid);
  const balance = pending;

  const history: { title: string; date: Date; amount: number; status: string }[] = [];
  for (const b of bookings) {
    for (const p of b.payments) {
      history.push({
        title: p.notes || "Payment",
        date: p.paymentDate,
        amount: Number(p.amount),
        status: "Paid",
      });
    }
    for (const s of b.schedules) {
      if (Number(s.balance) <= 0) continue;
      const due = s.dueDate.getTime() < Date.now() ? "Pending" : "Upcoming";
      history.push({
        title: `Installment #${s.installmentNumber}`,
        date: s.dueDate,
        amount: Number(s.balance),
        status: due,
      });
    }
  }
  history.sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div>
      <MobileHeader title="Payments" backHref="/dashboard" />

      <div
        className="rounded-[14px] p-4 text-white"
        style={{ background: "var(--brand-gradient)" }}
      >
        <p className="text-[11px] font-medium opacity-90">Total Price</p>
        <p className="mt-1 text-[24px] font-bold">{formatINR(totalPrice)}</p>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          { label: "Total Paid", value: formatINR(totalPaid), color: "#16a34a" },
          { label: "Pending Amount", value: formatINR(pending), color: "#ea580c" },
          { label: "Balance", value: formatINR(balance), color: "#2563eb" },
        ].map((c) => (
          <div key={c.label} className="m-card p-2.5 text-center">
            <p className="text-[10px] text-[var(--muted)]">{c.label}</p>
            <p className="mt-1 text-[12px] font-bold" style={{ color: c.color }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[var(--ink)]">Payment History</p>
        <Link href="/payments/schedule" className="text-[12px] font-semibold text-[var(--brand)]">
          Schedule
        </Link>
      </div>

      {history.length === 0 ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">No payments yet</div>
      ) : (
        <div className="m-card px-3">
          {history.map((h, i) => (
            <div key={`${h.title}-${i}`} className="list-row">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--ink)]">{h.title}</p>
                <p className="text-[11px] text-[var(--muted)]">
                  {h.date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-[var(--ink)]">{formatINR(h.amount)}</p>
                <StatusBadge status={h.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
