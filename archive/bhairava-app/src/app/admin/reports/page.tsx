import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutGrid,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orgId = session.orgId;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    projectCount,
    plotCount,
    plotsByStatus,
    bookingCount,
    activeBookings,
    soldBookings,
    paidThisMonth,
    paidAllTime,
    registrationByStatus,
    resaleByStatus,
    customerCount,
    agentCount,
  ] = await Promise.all([
    prisma.project.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.plot.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.plot.groupBy({
      by: ["status"],
      where: { organizationId: orgId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.booking.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.booking.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        bookingStatus: {
          in: ["RESERVED", "BOOKED", "AGREEMENT", "PENDING_DOCS", "UNDER_DOCUMENTATION"],
        },
      },
    }),
    prisma.booking.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        bookingStatus: { in: ["SOLD", "REGISTERED"] },
      },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: "PAID",
        paymentDate: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId: orgId, deletedAt: null, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.registration.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.resaleListing.groupBy({
      by: ["status"],
      where: { organizationId: orgId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.customer.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.agent.count({ where: { organizationId: orgId, deletedAt: null } }),
  ]);

  const statusMap = Object.fromEntries(
    plotsByStatus.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;

  const cards = [
    {
      label: "Projects",
      value: String(projectCount),
      hint: "Active inventory sites",
      href: "/admin/projects",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "Plots",
      value: String(plotCount),
      hint: `${statusMap.AVAILABLE ?? 0} available`,
      href: "/admin/plots",
      icon: <LayoutGrid className="h-4 w-4" />,
    },
    {
      label: "Bookings",
      value: String(bookingCount),
      hint: `${activeBookings} in progress · ${soldBookings} sold`,
      href: "/admin/bookings",
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: "Collections (month)",
      value: formatINR(Number(paidThisMonth._sum.amount ?? 0)),
      hint: `All-time ${formatINR(Number(paidAllTime._sum.amount ?? 0))}`,
      href: "/admin/payments",
      icon: <Wallet className="h-4 w-4" />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live aggregates and CSV exports.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["bookings", "Bookings CSV"],
            ["payments", "Payments CSV"],
            ["inventory", "Inventory CSV"],
            ["customers", "Customers CSV"],
            ["agents", "Agents CSV"],
          ] as const
        ).map(([type, label]) => (
          <a
            key={type}
            href={`/api/admin/reports/export?type=${type}`}
            className="btn-primary px-3 py-2 text-xs"
          >
            {label}
          </a>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-border bg-white p-4 transition hover:border-primary/30"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {c.label}
              </p>
              <span className="text-primary">{c.icon}</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Inventory by status
            </h3>
          </div>
          <ul className="space-y-0">
            {Object.entries(PLOT_STATUS_COLORS).map(([status, meta]) => {
              const count = statusMap[status] ?? 0;
              const pct = plotCount > 0 ? Math.round((count / plotCount) * 100) : 0;
              return (
                <li key={status} className="flex items-center gap-3 py-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: meta.hex }}
                  />
                  <span className="w-28 shrink-0 text-sm font-medium text-foreground">
                    {meta.label}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 rounded-full bg-canvas">
                    <div
                      className="h-1.5 rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-foreground">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Pipeline
              </h3>
            </div>
            <ul className="space-y-0">
              <li className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">Customers</span>
                <span className="font-semibold text-foreground">{customerCount}</span>
              </li>
              <li className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">Agents</span>
                <span className="font-semibold text-foreground">{agentCount}</span>
              </li>
              <li className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">Bookings in progress</span>
                <span className="font-semibold text-foreground">{activeBookings}</span>
              </li>
              <li className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">Sold / registered</span>
                <span className="font-semibold text-foreground">{soldBookings}</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Registrations & resale
              </h3>
            </div>
            <ul className="space-y-0">
              {registrationByStatus.length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">No registrations yet</li>
              ) : (
                registrationByStatus.map((r) => (
                  <li key={r.status} className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Reg · {r.status.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-foreground">{r._count._all}</span>
                  </li>
                ))
              )}
              {resaleByStatus.length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">No resale listings yet</li>
              ) : (
                resaleByStatus.map((r) => (
                  <li key={r.status} className="flex justify-between py-2 text-sm">
                    <span className={cn("text-muted-foreground")}>
                      Resale · {r.status.replaceAll("_", " ")}
                    </span>
                    <span className="font-semibold text-foreground">{r._count._all}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
