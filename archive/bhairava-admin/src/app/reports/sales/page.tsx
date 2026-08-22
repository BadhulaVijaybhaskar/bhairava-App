"use client";
import { useMemo, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader, Panel, SectionTitle, Metric, DataTable, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { bookings, customers, projects, agents, salesTrend, byId, formatINR } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const periods = ["Last 3 months", "Last 6 months", "Last 8 months"];

export default function SalesReport() {
  const [period, setPeriod] = useState("Last 8 months");
  const [projectId, setProjectId] = useState("All");

  const trend = useMemo(() => {
    const n = period === "Last 3 months" ? 3 : period === "Last 6 months" ? 6 : 8;
    return salesTrend.slice(-n);
  }, [period]);

  const byProject = useMemo(() => {
    return projects.map((p) => ({
      name: p.code,
      value: bookings.filter((b) => b.projectId === p.id).reduce((a, b) => a + b.amount, 0) / 1e7,
    }));
  }, []);

  const filteredBookings = useMemo(
    () => (projectId === "All" ? bookings : bookings.filter((b) => b.projectId === projectId)).slice(0, 20),
    [projectId],
  );

  const totalBookings = bookings.length;
  const totalValue = bookings.reduce((a, b) => a + b.amount, 0);
  const registered = bookings.filter((b) => b.stage === "Registered").length;
  const avgTicket = totalValue / (totalBookings || 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Sales Performance"
        description="Bookings velocity and revenue distribution across the portfolio."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total bookings" value={String(totalBookings)} hint="all time" />
        <Metric label="Booking value" value={formatINR(totalValue, { compact: true })} />
        <Metric label="Registered" value={String(registered)} hint={`of ${totalBookings}`} />
        <Metric label="Avg ticket size" value={formatINR(avgTicket, { compact: true })} />
      </div>

      <div className="flex flex-wrap gap-2 pt-6 pb-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              p === period ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c",
            )}
          >
            {p}
          </button>
        ))}
        <div className="flex-1" />
        {["All", ...projects.map((p) => p.id)].map((id) => (
          <button
            key={id}
            onClick={() => setProjectId(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              id === projectId ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c",
            )}
          >
            {id === "All" ? "All projects" : byId(projects, id)?.code}
          </button>
        ))}
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside="bookings / site visits">Bookings trend</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="bookings" stroke="var(--primary)" fill="url(#bookingsFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle aside="₹ Cr">Sales by project</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProject}>
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle>Recent bookings</SectionTitle>
        <DataTable
          rows={filteredBookings}
          columns={[
            { key: "id", header: "Booking", cell: (b) => <span className="numeric text-sm font-medium">{b.id}</span> },
            { key: "customer", header: "Customer", cell: (b) => <span className="text-sm">{byId(customers, b.customerId)?.name ?? "—"}</span> },
            { key: "project", header: "Project", cell: (b) => <span className="text-sm text-muted-foreground">{byId(projects, b.projectId)?.code ?? "—"}</span> },
            { key: "agent", header: "Agent", cell: (b) => <span className="text-sm text-muted-foreground">{byId(agents, b.agentId)?.name ?? "—"}</span> },
            { key: "stage", header: "Stage", cell: (b) => <Chip>{b.stage}</Chip> },
            { key: "amount", header: "Value", align: "right", cell: (b) => <span className="numeric text-sm font-medium">{formatINR(b.amount, { compact: true })}</span> },
          ]}
        />
      </div>
    </AppShell>
  );
}
