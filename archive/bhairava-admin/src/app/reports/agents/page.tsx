"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader, Panel, SectionTitle, Metric, DataTable, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { agents, bookings, customers, byId, formatINR, type Agent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const trendMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export default function AgentsReport() {
  const ranked = useMemo(() => [...agents].sort((a, b) => b.salesCr - a.salesCr), []);
  const [selectedId, setSelectedId] = useState<string>(ranked[0]?.id ?? "");
  const selected: Agent | undefined = byId(agents, selectedId);
  const maxSales = Math.max(...ranked.map((a) => a.salesCr), 1);

  const trend = useMemo(() => {
    return trendMonths.map((m, i) => ({
      month: m,
      value: selected ? Math.round(selected.salesCr * (0.6 + 0.07 * i) * 10) / 10 : 0,
    }));
  }, [selected]);

  const agentBookings = useMemo(
    () => bookings.filter((b) => b.agentId === selectedId).slice(0, 15),
    [selectedId],
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Agent Performance"
        description="Ranking sales agents by revenue, conversion and target attainment."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Active agents" value={String(agents.filter((a) => a.status === "Active").length)} hint={`of ${agents.length}`} />
        <Metric label="Total sales" value={`₹${ranked.reduce((a, b) => a + b.salesCr, 0).toFixed(1)} Cr`} />
        <Metric label="Avg conversion" value={`${Math.round((ranked.reduce((a, b) => a + b.conversion, 0) / (ranked.length || 1)) * 100)}%`} />
        <Metric label="Top performer" value={ranked[0]?.name ?? "—"} hint={`₹${ranked[0]?.salesCr.toFixed(1)} Cr`} />
      </div>

      <div className="grid gap-4 pt-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside="₹ Cr">Leaderboard</SectionTitle>
          <div className="space-y-3">
            {ranked.map((a, i) => {
              const attainment = Math.round((a.salesCr / a.target) * 100);
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                    a.id === selectedId ? "bg-surface-low" : "hover:bg-surface-low/60",
                  )}
                >
                  <span className="numeric w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                    {initials(a.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <span className="numeric text-xs text-muted-foreground">{formatINR(a.salesCr * 1e7, { compact: true })}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-c">
                      <div className="gradient-primary h-full rounded-full" style={{ width: `${Math.min((a.salesCr / maxSales) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right">
                    <p className="numeric text-xs font-medium">{Math.round(a.conversion * 100)}%</p>
                    <p className={cn("numeric text-[11px]", attainment >= 100 ? "text-primary" : "text-muted-foreground")}>{attainment}% target</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle aside={selected?.name ?? "—"}>Sales trend</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle aside={`${agentBookings.length} bookings`}>{selected?.name ?? "Agent"} · Bookings & customers</SectionTitle>
        <DataTable
          rows={agentBookings}
          columns={[
            { key: "id", header: "Booking", cell: (b) => <span className="numeric text-sm font-medium">{b.id}</span> },
            { key: "customer", header: "Customer", cell: (b) => <span className="text-sm">{byId(customers, b.customerId)?.name ?? "—"}</span> },
            { key: "stage", header: "Stage", cell: (b) => <Chip>{b.stage}</Chip> },
            { key: "date", header: "Date", cell: (b) => <span className="numeric text-xs text-muted-foreground">{b.date}</span> },
            { key: "amount", header: "Value", align: "right", cell: (b) => <span className="numeric text-sm font-medium">{formatINR(b.amount, { compact: true })}</span> },
          ]}
        />
      </div>
    </AppShell>
  );
}
