import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, FileText, CreditCard, Wallet, Clock } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { StatusBadge } from "@/components/mobile/status-badge";

export default async function CustomerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const firstName = session.name.split(" ")[0];

  if (!session.customerId) {
    return (
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[var(--ink)]">Hello, {firstName}</h1>
            <p className="text-[13px] text-[var(--muted)]">Welcome!</p>
          </div>
        </div>
        <div className="m-card p-4 text-[13px] text-[var(--muted)]">
          No customer profile linked yet.
          <Link href="/projects" className="mt-3 block font-semibold text-[var(--brand)]">
            Browse projects →
          </Link>
        </div>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.customerId, deletedAt: null },
    include: {
      project: { select: { name: true, id: true } },
      plot: {
        select: {
          plotNumber: true,
          area: true,
          areaUnit: true,
          facing: true,
          status: true,
          block: { select: { name: true } },
        },
      },
      payments: { where: { deletedAt: null }, select: { amount: true } },
      schedules: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { bookingDate: "desc" },
  });

  const primary = bookings[0];
  const totalPaid = bookings.reduce(
    (s, b) => s + b.payments.reduce((ps, p) => ps + Number(p.amount), 0),
    0,
  );
  const pending = bookings.reduce((s, b) => {
    const paid = b.payments.reduce((ps, p) => ps + Number(p.amount), 0);
    return s + Math.max(0, Number(b.finalAmount) - paid);
  }, 0);
  const paymentCount = bookings.reduce((s, b) => s + b.payments.length, 0);
  const docCount = await prisma.document.count({
    where: { customerId: session.customerId, deletedAt: null },
  });
  const nextDue = primary?.schedules.find((s) => Number(s.balance) > 0);

  const areaUnit =
    primary?.plot.areaUnit === "SQ_YARD"
      ? "Sq. Yds"
      : primary?.plot.areaUnit?.replace("_", " ") ?? "";

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-[var(--ink)]">Hello, {firstName}</h1>
          <p className="text-[13px] text-[var(--muted)]">Welcome!</p>
        </div>
        <Link
          href="/more"
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--ink)] shadow-sm"
        >
          <Bell size={18} />
        </Link>
      </div>

      {primary ? (
        <Link
          href="/my-plot"
          className="block rounded-[14px] p-4 text-white shadow-sm"
          style={{ background: "var(--brand-gradient)" }}
        >
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase opacity-90">My Plot</p>
          <p className="mt-1 text-[18px] font-bold">
            {primary.plot.plotNumber}, {primary.project.name}
          </p>
          <p className="mt-1 text-[12px] opacity-90">
            {Number(primary.plot.area)} {areaUnit}
            {primary.plot.facing ? ` | ${primary.plot.facing.replaceAll("_", " ")} Facing` : ""}
          </p>
          <div className="mt-3">
            <StatusBadge status={primary.plot.status} />
          </div>
        </Link>
      ) : (
        <div className="m-card p-4">
          <p className="font-semibold text-[var(--ink)]">No plot yet</p>
          <Link href="/projects" className="mt-2 text-[13px] font-semibold text-[var(--brand)]">
            Browse projects →
          </Link>
        </div>
      )}

      <p className="mt-4 mb-2 text-[11px] font-bold tracking-wide text-[var(--muted)] uppercase">
        Quick Summary
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total Paid", value: formatINR(totalPaid), icon: Wallet, tone: "#16a34a" },
          { label: "Pending Amount", value: formatINR(pending), icon: Clock, tone: "#ea580c" },
          { label: "Documents", value: String(docCount), icon: FileText, tone: "#2563eb" },
          { label: "Payments", value: String(paymentCount), icon: CreditCard, tone: "#6d28d9" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="m-card flex items-center gap-2.5 p-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${c.tone}18`, color: c.tone }}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-[var(--muted)]">{c.label}</p>
                <p className="truncate text-[14px] font-bold text-[var(--ink)]">{c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {nextDue ? (
        <div className="m-card mt-3 flex items-center justify-between gap-3 p-3.5">
          <div>
            <p className="text-[11px] font-medium text-[var(--muted)]">Next Payment Due</p>
            <p className="text-[16px] font-bold text-[var(--ink)]">
              {formatINR(Number(nextDue.balance))}
            </p>
          </div>
          <Link
            href="/payments/schedule"
            className="text-[12px] font-semibold whitespace-nowrap text-[var(--brand)]"
          >
            View Payment Schedule
          </Link>
        </div>
      ) : null}
    </div>
  );
}
