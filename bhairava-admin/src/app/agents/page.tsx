"use client";
import { useMemo, useState } from "react";
import { PageHeader, FilterBar, Chip, DataTable, Metric, NewRecordButton } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { bookings, formatINR, type Agent } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

const views = ["All", "Active", "Inactive"];

export default function AgentsIndex() {
  const { agents } = useData();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (active !== "All" && a.status !== active) return false;
      if (query && !`${a.name} ${a.code} ${a.region}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [agents, active, query]);

  const totalSales = agents.reduce((a, x) => a + x.salesCr, 0);
  const avgConversion = agents.reduce((a, x) => a + x.conversion, 0) / (agents.length || 1);
  const activeCount = agents.filter((a) => a.status === "Active").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Relationships"
        title="Agents"
        description="Field sales performance across regions, projects and targets."
        actions={<NewRecordButton to="/onboarding/agent">New agent</NewRecordButton>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total sales" value={`₹${totalSales.toFixed(1)} Cr`} hint="across all agents" />
        <Metric label="Avg conversion" value={`${Math.round(avgConversion * 100)}%`} hint="site visit to booking" />
        <Metric label="Active agents" value={String(activeCount)} hint={`of ${agents.length}`} />
      </div>

      <div className="pt-6">
        <FilterBar
          views={views}
          active={active}
          onSelect={setActive}
          query={query}
          onQuery={setQuery}
          placeholder="Search agents…"
          right={<span className="numeric px-2 text-xs text-muted-foreground">{filtered.length} of {agents.length}</span>}
        />

        <DataTable<Agent>
          rows={filtered}
          linkTo="/agents/$agentId"
          params={(a) => ({ agentId: a.id })}
          columns={[
            {
              key: "name",
              header: "Agent",
              cell: (a) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold text-foreground">
                    {a.code}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.region}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "projects",
              header: "Projects",
              align: "right",
              cell: (a) => <span className="numeric text-xs">{a.projects.length}</span>,
            },
            {
              key: "bookings",
              header: "Bookings",
              align: "right",
              cell: (a) => (
                <span className="numeric text-xs">{bookings.filter((b) => b.agentId === a.id).length}</span>
              ),
            },
            {
              key: "sales",
              header: "Sales",
              align: "right",
              cell: (a) => <span className="numeric text-xs font-medium">₹{a.salesCr.toFixed(1)} Cr</span>,
            },
            {
              key: "conversion",
              header: "Conversion",
              align: "right",
              cell: (a) => <span className="numeric text-xs">{Math.round(a.conversion * 100)}%</span>,
            },
            {
              key: "target",
              header: "Target attainment",
              width: "180px",
              cell: (a) => {
                const pct = Math.min(100, Math.round((a.bookings / a.target) * 100));
                return (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-c">
                      <div
                        className={cn("h-full rounded-full", pct >= 100 ? "bg-primary" : "bg-secondary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="numeric text-[11px] text-muted-foreground">{pct}%</span>
                  </div>
                );
              },
            },
            { key: "status", header: "Status", cell: (a) => <Chip>{a.status}</Chip> },
          ]}
        />
      </div>
    </AppShell>
  );
}
