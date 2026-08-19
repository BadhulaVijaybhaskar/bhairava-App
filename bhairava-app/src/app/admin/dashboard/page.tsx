import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatINR } from "@/lib/money";
import { formatIndianDate } from "@/lib/dates";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { PlotStatus } from "@prisma/client";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { QuickCreateMenu } from "@/components/dashboard/quick-create-menu";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { RecentBookingsList } from "@/components/dashboard/recent-bookings-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, Sparkles } from "lucide-react";

const STATUS_ORDER: PlotStatus[] = [
  "AVAILABLE",
  "SOLD",
  "RESERVED",
  "RESALE_AVAILABLE",
  "BOOKED",
  "UNDER_DOCUMENTATION",
  "REGISTERED",
  "BLOCKED",
];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const orgId = session.orgId;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    projectCount,
    plotCount,
    plotsByStatus,
    recentBookings,
    paidSum,
    monthPayments,
    activeProjects,
    projectInventory,
  ] = await Promise.all([
    prisma.project.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.plot.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.plot.groupBy({
      by: ["status"],
      where: { organizationId: orgId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.booking.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { plot: true, project: true, customer: true },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentDate: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentDate: { gte: monthStart },
      },
      select: { amount: true, paymentDate: true },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, deletedAt: null, status: "ACTIVE" },
      take: 3,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        totalPlots: true,
        _count: { select: { plots: true } },
      },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, deletedAt: null, status: "ACTIVE" },
      take: 6,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        plots: { where: { deletedAt: null }, select: { status: true } },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    plotsByStatus.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;

  const highlightStatuses: PlotStatus[] = [
    "AVAILABLE",
    "SOLD",
    "RESERVED",
    "RESALE_AVAILABLE",
  ];
  const inventoryTotal = Math.max(plotCount, 1);

  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const chartData = chartDays.map((day) => {
    const amount = monthPayments
      .filter((p) => {
        const pd = new Date(p.paymentDate);
        return (
          pd.getFullYear() === day.getFullYear() &&
          pd.getMonth() === day.getMonth() &&
          pd.getDate() === day.getDate()
        );
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      label: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      amount,
    };
  });

  const revenue = Number(paidSum._sum.amount ?? 0);
  const soldPct = Math.round(((statusMap.SOLD ?? 0) / inventoryTotal) * 100);

  const heatProjects = projectInventory.map((p) => {
    const counts: Record<string, number> = {};
    for (const plot of p.plots) {
      counts[plot.status] = (counts[plot.status] ?? 0) + 1;
    }
    return { id: p.id, name: p.name, total: p.plots.length, counts };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">
            Portfolio Operations
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <QuickCreateMenu />
      </div>

      <DashboardKpis
        projectCount={projectCount}
        plotCount={plotCount}
        soldPct={soldPct}
        revenue={revenue}
      />

      <Card className="border-none shadow-none bg-white">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="text-[15px]">Inventory Pulse</CardTitle>
            <CardDescription>Live status mix across all plots</CardDescription>
          </div>
          <Link href="/admin/plots" className="text-[13px] font-semibold text-primary">
            View plots
          </Link>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="inventory-bar flex h-2.5 overflow-hidden rounded-full bg-[#E7EFF6]">
            {STATUS_ORDER.map((status, idx) => {
              const count = statusMap[status] ?? 0;
              if (!count) return null;
              const width = `${(count / inventoryTotal) * 100}%`;
              return (
                <span
                  key={status}
                  className="h-full"
                  style={{
                    width,
                    background: PLOT_STATUS_COLORS[status].hex,
                    animationDelay: `${idx * 0.05}s`,
                  }}
                  title={`${PLOT_STATUS_COLORS[status].label}: ${count}`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {highlightStatuses.map((status) => {
              const meta = PLOT_STATUS_COLORS[status];
              const count = statusMap[status] ?? 0;
              return (
                <div
                  key={status}
                  className="rounded-xl bg-[#EFF4F8] px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="status-dot" style={{ background: meta.hex }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                  <p className="font-display mt-1.5 tabular-nums text-xl font-bold tracking-tight text-foreground">
                    {count}
                  </p>
                </div>
              );
            })}
          </div>

          {heatProjects.length > 0 ? (
            <div className="space-y-2 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                By project
              </p>
              {heatProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="w-28 shrink-0 truncate text-[12px] font-semibold text-foreground hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#E7EFF6]">
                    {(["AVAILABLE", "RESERVED", "BOOKED", "SOLD"] as PlotStatus[]).map((s) => {
                      const c = p.counts[s] ?? 0;
                      if (!c || !p.total) return null;
                      return (
                        <span
                          key={s}
                          className="h-full"
                          style={{
                            width: `${(c / p.total) * 100}%`,
                            background: PLOT_STATUS_COLORS[s].hex,
                          }}
                          title={`${PLOT_STATUS_COLORS[s].label}: ${c}`}
                        />
                      );
                    })}
                  </div>
                  <span className="font-display w-8 text-right tabular-nums text-[11px] text-muted-foreground">
                    {p.total}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-none shadow-none bg-white lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
            <div>
              <CardTitle className="text-[15px]">Revenue</CardTitle>
              <CardDescription>Last 7 days · this month</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--success)]">
              <span className="status-dot bg-[var(--success)]" />
              Live
            </span>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-display tabular-nums text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {formatINR(revenue)}
            </p>
            <div className="mt-2">
              <RevenueChart data={chartData} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none bg-white lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[15px]">Active projects</CardTitle>
            <Link href="/admin/projects" className="text-[13px] font-semibold text-primary">
              All
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {activeProjects.length === 0 ? (
                <li className="rounded-xl bg-[#EFF4F8] px-4 py-6 text-sm text-muted-foreground">
                  No active projects yet.
                </li>
              ) : (
                activeProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="group flex items-center justify-between rounded-xl bg-[#EFF4F8] px-3 py-2.5 transition hover:bg-[#E7EFF6]"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-foreground group-hover:text-primary">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.city || "—"} · {p._count.plots || p.totalPlots} plots
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-none bg-white">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="text-[15px]">Recent Bookings</CardTitle>
            <CardDescription>Latest reservation activity — click to preview</CardDescription>
          </div>
          <Link href="/admin/bookings" className="text-[13px] font-semibold text-primary">
            Open bookings
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {recentBookings.length === 0 ? (
            <div className="rounded-xl bg-[#EFF4F8] px-5 py-8 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#E7EFF6] text-primary">
                <Sparkles className="size-5" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-foreground">
                Ready for your first booking
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                When a plot is reserved, it will show here with amount, customer, and status.
              </p>
              <Link
                href="/admin/bookings/new"
                className="btn-primary mt-4 inline-flex px-4 py-2.5 text-sm"
              >
                Create booking
              </Link>
            </div>
          ) : (
            <RecentBookingsList
              items={recentBookings.map((b) => ({
                id: b.id,
                plotNumber: b.plot.plotNumber,
                projectName: b.project.name,
                customerName: b.customer.fullName,
                bookingDateLabel: formatIndianDate(b.bookingDate),
                amount: Number(b.finalAmount),
                status: b.bookingStatus,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
