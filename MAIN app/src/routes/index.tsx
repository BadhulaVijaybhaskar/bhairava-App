import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarCheck2,
  Clock3,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, Metric, Panel, SectionTitle } from "@/components/kit";
import {
  bookings,
  cashflow,
  customers,
  byId,
  formatINR,
  plots,
  projects,
  reservations,
  salesTrend,
} from "@/lib/mock-data";
import { useData } from "@/lib/store";

const visitTodayIso = new Date().toISOString().slice(0, 10);
const isActiveVisit = (s: string) => s === "Scheduled" || s === "Confirmed" || s === "Rescheduled";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bhairava Dashboard — Land Sales Command Centre" },
      {
        name: "description",
        content:
          "Live inventory, collections, bookings and agent performance for Bhairava's plot sales operations in one luminous command centre.",
      },
      { property: "og:title", content: "Bhairava Dashboard — Land Sales Command Centre" },
      {
        property: "og:description",
        content: "Live inventory, collections, bookings and agent performance in one command centre.",
      },
    ],
  }),
  component: Dashboard,
});

const chartAxis = {
  stroke: "var(--outline-variant)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
};

const quickActions: { label: string; to: string; icon: LucideIcon; badge?: "clock" }[] = [
  { label: "Today's Visits", to: "/site-visits", icon: CalendarCheck2 },
  { label: "Follow-ups", to: "/notifications", icon: UserRound, badge: "clock" },
  { label: "At Risk", to: "/reservations", icon: AlertTriangle },
  { label: "Pending Payments", to: "/payments", icon: Banknote, badge: "clock" },
];

function QuickActionTile({
  label,
  to,
  icon: Icon,
  badge,
  index,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: "clock";
  index: number;
}) {
  return (
    <Link
      to={to}
      className="rise flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant/40 bg-surface-lowest px-1.5 py-3 text-center transition-transform active:scale-[0.97]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="relative inline-flex">
        <Icon className="h-6 w-6 text-primary" strokeWidth={1.55} />
        {badge === "clock" && (
          <Clock3
            className="absolute -right-1.5 -bottom-1 h-3 w-3 rounded-full bg-surface-lowest text-primary"
            strokeWidth={2.2}
          />
        )}
      </span>
      <span className="text-[10px] leading-tight font-medium text-foreground">{label}</span>
    </Link>
  );
}

function Dashboard() {
  const available = plots.filter((p) => p.status === "available").length;
  const recent = bookings.slice(0, 6);
  const { siteVisits } = useData();
  const todayVisits = siteVisits.filter((v) => v.date === visitTodayIso && isActiveVisit(v.status)).length;
  const upcomingVisits = siteVisits.filter((v) => v.date > visitTodayIso && isActiveVisit(v.status)).length;
  const availablePct = plots.length ? Math.round((available / plots.length) * 100) : 0;

  return (
    <AppShell>
      {/* ---------- MOBILE dashboard: compact, high information density ---------- */}
      <div className="min-w-0 max-w-full space-y-4 overflow-x-clip lg:hidden">
        <h1 className="pt-1 font-display text-[22px] font-semibold tracking-[-0.03em]">Dashboard</h1>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 pb-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Quick actions
            </p>
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">
              <span className="numeric font-semibold text-foreground">{todayVisits}</span> today ·{" "}
              <span className="numeric font-semibold text-foreground">{upcomingVisits}</span> upcoming
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-4">
            {quickActions.map((action, i) => (
              <QuickActionTile key={action.label} {...action} index={i} />
            ))}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3">
          <Metric label="Collected" value="₹18.2 Cr" delta="+21.3%" hint="vs Jul" accent />
          <Metric label="Bookings" value="34" delta="+7" hint="this month" />
          <Metric label="Outstanding" value="₹5.3 Cr" delta="-4.1%" hint="due < 30d" />
          <Metric
            label="Plots available"
            value={`${available} / ${plots.length}`}
            hint={`${availablePct}% available`}
          />
        </div>

        <Panel className="min-w-0 p-3.5">
          <SectionTitle aside={<Link to="/projects">All projects</Link>}>Project absorption</SectionTitle>
          <div className="space-y-2">
            {projects.slice(0, 4).map((p) => {
              const pct = Math.round((p.soldPlots / p.totalPlots) * 100);
              return (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: p.id }}
                      className="truncate text-sm font-medium"
                    >
                      {p.name}
                    </Link>
                    <span className="numeric text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-c">
                    <div className="gradient-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="min-w-0">
          <SectionTitle aside="8 months">Cashflow vs target</SectionTitle>
          <div className="h-56 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflow} margin={{ left: -22, right: 4, top: 6 }}>
                <defs>
                  <linearGradient id="collectedMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-lowest)",
                    border: "none",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-float)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#collectedMobile)"
                />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="var(--secondary)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="min-w-0" tonal>
          <SectionTitle aside="Bookings vs site visits">Sales momentum</SectionTitle>
          <div className="h-56 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrend} margin={{ left: -22, right: 4, top: 6 }}>
                <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                <XAxis dataKey="month" {...chartAxis} />
                <YAxis {...chartAxis} width={40} />
                <Tooltip
                  cursor={{ fill: "var(--surface-c)" }}
                  contentStyle={{
                    background: "var(--surface-lowest)",
                    border: "none",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-float)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="siteVisits" fill="var(--surface-highest)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="bookings" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionTitle aside={<Link to="/bookings">View all</Link>}>Recent bookings</SectionTitle>
          <div className="space-y-1.5">
            {recent.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to="/bookings/$bookingId"
                params={{ bookingId: r.id }}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-low px-3 py-2 transition-colors active:bg-surface-c"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{byId(customers, r.customerId)?.name ?? "—"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {byId(projects, r.projectId)?.name ?? "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numeric text-xs font-medium">{formatINR(r.amount, { compact: true })}</p>
                  <div className="pt-0.5">
                    <Chip>{r.stage}</Chip>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel tonal>
          <SectionTitle aside={<Link to="/reservations">Manage</Link>}>Reservations at risk</SectionTitle>
          <div className="space-y-1.5">
            {reservations
              .filter((r) => r.state !== "Converted")
              .slice(0, 4)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-lowest px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{byId(customers, r.customerId)?.name ?? "—"}</p>
                    <p className="numeric text-[11px] text-muted-foreground">{r.plotId}</p>
                  </div>
                  <Chip>{r.state}</Chip>
                </div>
              ))}
          </div>
        </Panel>
      </div>

      {/* ---------- DESKTOP dashboard ---------- */}
      <div className="hidden lg:block">
        <div className="flex flex-wrap items-end justify-between gap-4 py-8">
          <div>
            <p className="pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Wednesday · 19 August 2026
            </p>
            <h1 className="font-display text-3xl font-semibold">Good morning, Vijay</h1>
            <p className="pt-2 text-sm text-muted-foreground">
              ₹18.2 Cr collected this month across {projects.filter((p) => p.status === "Active").length}{" "}
              active projects.
            </p>
          </div>
          <Link
            to="/plots/layout"
            className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Open live layout <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="space-y-2.5 pb-4">
          <p className="text-[13px] font-semibold text-foreground">Quick actions</p>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <QuickActionTile key={action.label} {...action} index={i} />
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Metric label="Collected this month" value="₹18.2 Cr" delta="+21.3%" hint="vs July" size="lg" accent />
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            <Metric label="Bookings" value="34" delta="+7" hint="this month" />
            <Metric label="Outstanding" value="₹5.3 Cr" delta="-4.1%" hint="due < 30d" />
            <Metric label="Plots available" value={String(available)} hint={`of ${plots.length}`} />
          </div>
        </div>

        <div className="grid gap-4 pt-4 lg:grid-cols-12">
          <Panel className="lg:col-span-7">
            <SectionTitle aside="Last 8 months">Cashflow vs target</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow} margin={{ left: -20, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="month" {...chartAxis} />
                  <YAxis {...chartAxis} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-lowest)",
                      border: "none",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-float)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#collected)"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="var(--secondary)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel className="lg:col-span-5" tonal>
            <SectionTitle aside="Bookings vs site visits">Sales momentum</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="month" {...chartAxis} />
                  <YAxis {...chartAxis} />
                  <Tooltip
                    cursor={{ fill: "var(--surface-c)" }}
                    contentStyle={{
                      background: "var(--surface-lowest)",
                      border: "none",
                      borderRadius: 12,
                      boxShadow: "var(--shadow-float)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="siteVisits" fill="var(--surface-highest)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bookings" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 pt-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SectionTitle aside={<Link to="/bookings">View all</Link>}>Recent bookings</SectionTitle>
            <DataTable
              rows={recent}
              linkTo="/bookings/$bookingId"
              params={(r) => ({ bookingId: r.id })}
              columns={[
                { key: "id", header: "Booking", cell: (r) => <span className="numeric">{r.id}</span> },
                { key: "cust", header: "Customer", cell: (r) => byId(customers, r.customerId)?.name ?? "—" },
                { key: "proj", header: "Project", cell: (r) => byId(projects, r.projectId)?.name ?? "—" },
                {
                  key: "amt",
                  header: "Amount",
                  align: "right",
                  cell: (r) => <span className="numeric">{formatINR(r.amount, { compact: true })}</span>,
                },
                { key: "stage", header: "Stage", cell: (r) => <Chip>{r.stage}</Chip> },
              ]}
            />
          </div>

          <div className="space-y-4 lg:col-span-4">
            <Panel>
              <SectionTitle aside={<Link to="/projects">All projects</Link>}>Project absorption</SectionTitle>
              <div className="space-y-5">
                {projects.slice(0, 4).map((p) => {
                  const pct = Math.round((p.soldPlots / p.totalPlots) * 100);
                  return (
                    <div key={p.id}>
                      <div className="flex items-baseline justify-between">
                        <Link
                          to="/projects/$projectId"
                          params={{ projectId: p.id }}
                          className="text-sm font-medium"
                        >
                          {p.name}
                        </Link>
                        <span className="numeric text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-c">
                        <div className="gradient-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel tonal>
              <SectionTitle aside={<Link to="/reservations">Manage</Link>}>Reservations at risk</SectionTitle>
              <div className="space-y-3">
                {reservations
                  .filter((r) => r.state !== "Converted")
                  .slice(0, 4)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-xl bg-surface-lowest px-3 py-2.5"
                    >
                      <div>
                        <p className="numeric text-xs font-medium">{r.plotId.split("-")[1]}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {byId(customers, r.customerId)?.name}
                        </p>
                      </div>
                      <Chip>{r.state}</Chip>
                    </div>
                  ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
