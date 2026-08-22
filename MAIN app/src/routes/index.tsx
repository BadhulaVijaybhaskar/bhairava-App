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
  Banknote,
  BarChart3,
  CalendarCheck2,
  Home,
  LineChart,
  MapPinned,
  Clock3,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, Panel, SectionTitle } from "@/components/kit";
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
import { cn } from "@/lib/utils";

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
  { label: "Today's Visits", to: "/customers", icon: CalendarCheck2 },
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
      className="rise flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant/40 bg-surface-lowest px-1.5 py-3 text-center transition-transform active:scale-[0.97] sm:min-h-[104px] sm:gap-2.5 sm:px-2"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="relative inline-flex">
        <Icon className="h-6 w-6 text-primary sm:h-7 sm:w-7" strokeWidth={1.55} />
        {badge === "clock" && (
          <Clock3
            className="absolute -right-1.5 -bottom-1 h-3 w-3 rounded-full bg-surface-lowest text-primary sm:h-3.5 sm:w-3.5"
            strokeWidth={2.2}
          />
        )}
      </span>
      <span className="text-[10px] leading-tight font-medium text-foreground sm:text-[12px]">
        {label}
      </span>
    </Link>
  );
}

function KpiCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
  tone = "default",
  progress,
}: {
  label: string;
  value: string;
  hint: string;
  to: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "success";
  progress?: number;
}) {
  return (
    <Link
      to={to}
      className="panel lift flex min-h-[112px] flex-col justify-between gap-2 p-3.5 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "danger" ? "text-destructive" : tone === "success" ? "text-primary" : "text-primary",
          )}
          strokeWidth={1.8}
        />
      </div>
      <div>
        <p
          className={cn(
            "numeric text-[22px] font-semibold tracking-tight sm:text-2xl",
            tone === "danger" && "text-destructive",
          )}
        >
          {value}
        </p>
        {typeof progress === "number" ? (
          <div className="pt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-c">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <p className="pt-1.5 text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ) : (
          <p
            className={cn(
              "pt-1 text-[11px] font-medium",
              tone === "danger" ? "text-destructive" : "text-primary",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </Link>
  );
}

function Dashboard() {
  const available = plots.filter((p) => p.status === "available").length;
  const availablePct = Math.round((available / plots.length) * 100);
  const recent = bookings.slice(0, 6);

  return (
    <AppShell>
      <div className="rise flex items-center justify-between gap-3 py-4 sm:py-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <Link
          to="/plots/layout"
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface-c px-3 py-2 text-sm font-medium text-foreground"
          aria-label="Open live layout"
        >
          <MapPinned className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Live layout</span>
        </Link>
      </div>

      <section className="space-y-2.5">
        <p className="text-[13px] font-semibold text-foreground">Quick actions</p>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map((action, i) => (
            <QuickActionTile key={action.label} {...action} index={i} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 pt-4 lg:grid-cols-4">
        <KpiCard
          label="Collected"
          value="₹18.2 Cr"
          hint="+12.4%"
          to="/collections"
          icon={LineChart}
        />
        <KpiCard
          label="Bookings"
          value={String(bookings.length)}
          hint="+7 this week"
          to="/bookings"
          icon={BarChart3}
        />
        <KpiCard
          label="Outstanding"
          value="₹5.2 Cr"
          hint="+3.1%"
          to="/schedule"
          icon={BarChart3}
          tone="danger"
        />
        <KpiCard
          label="Plots Available"
          value={`${available}/${plots.length}`}
          hint={`(${availablePct}% available)`}
          to="/plots"
          icon={Home}
          tone="success"
          progress={availablePct}
        />
      </section>

      <div className="grid gap-4 pt-5 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <SectionTitle aside={<Link to="/projects">All projects</Link>}>Project absorption</SectionTitle>
          <div className="space-y-5">
            {projects.slice(0, 4).map((p) => {
              const pct = Math.round((p.soldPlots / p.totalPlots) * 100);
              return (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between">
                    <Link to="/projects/$projectId" params={{ projectId: p.id }} className="text-sm font-medium">
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

        <Panel className="lg:col-span-7">
          <SectionTitle aside="Last 8 months">Cashflow vs target</SectionTitle>
          <div className="h-56 sm:h-64">
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
      </div>

      <div className="pt-4">
        <Panel tonal>
          <SectionTitle aside="Bookings vs site visits">Sales momentum</SectionTitle>
          <div className="h-56 sm:h-64">
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

        <div className="lg:col-span-4">
          <Panel tonal>
            <SectionTitle aside={<Link to="/reservations">Manage</Link>}>Reservations at risk</SectionTitle>
            <div className="space-y-3">
              {reservations
                .filter((r) => r.state !== "Converted")
                .slice(0, 5)
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
    </AppShell>
  );
}
