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
  CalendarDays,
  CreditCard,
  IndianRupee,
  LayoutGrid,
  ListTodo,
  MapPinned,
  Receipt,
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
  payments,
  plots,
  projects,
  reservations,
  salesTrend,
  tasks,
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

type QuickAction = {
  label: string;
  to: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warn" | "accent";
};

function QuickActionTile({ action, index }: { action: QuickAction; index: number }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      className={cn(
        "lift panel sheen flex min-h-[88px] flex-col justify-between gap-3 p-3.5 sm:min-h-[96px] sm:p-4",
        action.tone === "accent" && "gradient-primary text-primary-foreground shadow-float",
        action.tone === "warn" && "bg-warning/12",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-[10px] font-semibold tracking-[0.14em] uppercase",
            action.tone === "accent" ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {action.label}
        </p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            action.tone === "accent"
              ? "text-primary-foreground/85"
              : action.tone === "warn"
                ? "text-warning-foreground"
                : "text-primary",
          )}
          strokeWidth={1.9}
        />
      </div>
      <div>
        <p className="numeric text-xl font-semibold tracking-tight sm:text-2xl">{action.value}</p>
        {action.hint && (
          <p
            className={cn(
              "pt-1 text-[11px]",
              action.tone === "accent" ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {action.hint}
          </p>
        )}
      </div>
    </Link>
  );
}

function Dashboard() {
  const available = plots.filter((p) => p.status === "available").length;
  const todayVisits = customers.filter((c) => c.stage === "Site visit").length;
  const openFollowUps = tasks.filter((t) => !t.done).length;
  const atRisk = reservations.filter((r) => r.state === "Expiring today" || r.state === "Expired").length;
  const pendingPayments = payments.filter((p) => p.status === "Pending").length;
  const recent = bookings.slice(0, 6);

  const opsActions: QuickAction[] = [
    {
      label: "Today's Visits",
      to: "/customers",
      value: String(todayVisits),
      hint: "Site visit stage",
      icon: CalendarDays,
    },
    {
      label: "Follow-ups",
      to: "/notifications",
      value: String(openFollowUps),
      hint: "Open tasks",
      icon: ListTodo,
    },
    {
      label: "At Risk",
      to: "/reservations",
      value: String(atRisk),
      hint: "Expiring / expired",
      icon: AlertTriangle,
      tone: "warn",
    },
    {
      label: "Pending Payments",
      to: "/payments",
      value: String(pendingPayments),
      hint: "Awaiting clearance",
      icon: CreditCard,
    },
  ];

  const metricActions: QuickAction[] = [
    {
      label: "Collected",
      to: "/collections",
      value: "₹18.2 Cr",
      hint: "+21.3% vs July",
      icon: IndianRupee,
      tone: "accent",
    },
    {
      label: "Bookings",
      to: "/bookings",
      value: "34",
      hint: "This month",
      icon: Receipt,
    },
    {
      label: "Outstanding",
      to: "/schedule",
      value: "₹5.3 Cr",
      hint: "Due < 30d",
      icon: CreditCard,
    },
    {
      label: "Plots Available",
      to: "/plots",
      value: String(available),
      hint: `of ${plots.length}`,
      icon: LayoutGrid,
    },
  ];

  return (
    <AppShell>
      <div className="rise flex flex-wrap items-end justify-between gap-3 py-5 sm:py-7">
        <div>
          <p className="pb-1.5 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Wednesday · 19 August 2026
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="max-w-xl pt-1.5 text-sm text-muted-foreground">
            ₹18.2 Cr collected this month across {projects.filter((p) => p.status === "Active").length}{" "}
            active projects.
          </p>
        </div>
        <Link
          to="/plots/layout"
          className="hidden items-center gap-1.5 rounded-lg bg-surface-c px-3.5 py-2.5 text-sm font-medium text-foreground sm:inline-flex"
        >
          <MapPinned className="h-4 w-4 text-primary" />
          Live layout
        </Link>
      </div>

      <section className="space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Quick actions
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {opsActions.map((action, i) => (
            <QuickActionTile key={action.label} action={action} index={i} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metricActions.map((action, i) => (
            <QuickActionTile key={action.label} action={action} index={i + opsActions.length} />
          ))}
        </div>
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
