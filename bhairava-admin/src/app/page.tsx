"use client";
import Link from "next/link";
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
import { ArrowUpRight } from "lucide-react";
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

const chartAxis = {
  stroke: "var(--outline-variant)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
};

export default function Dashboard() {
  const available = plots.filter((p) => p.status === "available").length;
  const recent = bookings.slice(0, 6);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4 py-8">
        <div>
          <p className="pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Wednesday · 19 August 2026
          </p>
          <h1 className="font-display text-3xl font-semibold">Good morning, Vijay</h1>
          <p className="pt-2 text-sm text-muted-foreground">
            ₹18.2 Cr collected this month across {projects.filter((p) => p.status === "Active").length} active
            projects.
          </p>
        </div>
        <Link
          href="/plots/layout"
          className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Open live layout <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Asymmetric metric band: one dominant figure + supporting blocks */}
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
          <SectionTitle aside={<Link href="/bookings">View all</Link>}>Recent bookings</SectionTitle>
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
            <SectionTitle aside={<Link href="/projects">All projects</Link>}>Project absorption</SectionTitle>
            <div className="space-y-5">
              {projects.slice(0, 4).map((p) => {
                const pct = Math.round((p.soldPlots / p.totalPlots) * 100);
                return (
                  <div key={p.id}>
                    <div className="flex items-baseline justify-between">
                      <Link href={`/projects/${p.id}`} className="text-sm font-medium">
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
            <SectionTitle aside={<Link href="/reservations">Manage</Link>}>Reservations at risk</SectionTitle>
            <div className="space-y-3">
              {reservations
                .filter((r) => r.state !== "Converted")
                .slice(0, 4)
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-surface-lowest px-3 py-2.5">
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
