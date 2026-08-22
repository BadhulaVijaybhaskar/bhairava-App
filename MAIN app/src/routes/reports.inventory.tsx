import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Metric, DataTable, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { plots, projects, customers, agents, byId, type PlotStatus, formatINR } from "@/lib/mock-data";
import { plotStatusSolid } from "@/lib/plot-status-colors";

export const Route = createFileRoute("/reports/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Report — Bhairava" },
      { name: "description", content: "Plot status distribution, per-project stock mix and drill-down inventory table." },
      { property: "og:title", content: "Inventory Report — Bhairava" },
      { property: "og:description", content: "Plot status distribution, per-project stock mix and drill-down inventory table." },
    ],
  }),
  component: InventoryReport,
});

const statuses: PlotStatus[] = ["available", "reserved", "booked", "registered", "resale"];
const statusColorVar = plotStatusSolid;

function InventoryReport() {
  const [selected, setSelected] = useState<PlotStatus | "all">("all");

  const counts = useMemo(() => {
    const map = new Map<PlotStatus, number>();
    statuses.forEach((s) => map.set(s, 0));
    plots.forEach((p) => map.set(p.status, (map.get(p.status) ?? 0) + 1));
    return statuses.map((s) => ({ name: s, value: map.get(s) ?? 0 }));
  }, []);

  const byProjectStacked = useMemo(() => {
    return projects.map((project) => {
      const row: Record<string, string | number> = { name: project.code };
      statuses.forEach((s) => {
        row[s] = plots.filter((p) => p.projectId === project.id && p.status === s).length;
      });
      return row;
    });
  }, []);

  const filteredPlots = useMemo(
    () => (selected === "all" ? plots : plots.filter((p) => p.status === selected)).slice(0, 24),
    [selected],
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Inventory Status"
        description="Live plot status mix across the portfolio, with drill-down detail."
        actions={
          <Link to="/plots/layout" className="inline-flex items-center gap-1.5 rounded-lg bg-surface-low px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Live layout <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <button onClick={() => setSelected("all")} className="text-left">
          <Metric label="Total plots" value={String(plots.length)} accent={selected === "all"} />
        </button>
        {counts.map((c) => (
          <button key={c.name} onClick={() => setSelected(c.name)} className="text-left">
            <Metric label={c.name} value={String(c.value)} accent={selected === c.name} />
          </button>
        ))}
      </div>

      <div className="grid gap-4 pt-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <SectionTitle>Status mix</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={counts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {counts.map((c) => (
                    <Cell key={c.name} fill={statusColorVar[c.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="lg:col-span-3">
          <SectionTitle>Stock mix by project</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProjectStacked}>
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                {statuses.map((s) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={statusColorVar[s]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle aside={selected === "all" ? "all statuses" : selected}>Plot detail</SectionTitle>
        <DataTable
          rows={filteredPlots}
          columns={[
            { key: "number", header: "Plot", cell: (p) => <span className="numeric text-sm font-medium">{p.number}</span> },
            { key: "project", header: "Project", cell: (p) => <span className="text-sm text-muted-foreground">{byId(projects, p.projectId)?.code ?? "—"}</span> },
            { key: "area", header: "Area", align: "right", cell: (p) => <span className="numeric text-sm">{p.areaSqYd} sq.yd</span> },
            { key: "facing", header: "Facing", cell: (p) => <span className="text-sm text-muted-foreground">{p.facing}</span> },
            { key: "status", header: "Status", cell: (p) => <Chip>{p.status}</Chip> },
            { key: "customer", header: "Customer", cell: (p) => <span className="text-sm">{byId(customers, p.customerId)?.name ?? "—"}</span> },
            { key: "agent", header: "Agent", cell: (p) => <span className="text-sm text-muted-foreground">{byId(agents, p.agentId)?.name ?? "—"}</span> },
            { key: "value", header: "Value", align: "right", cell: (p) => <span className="numeric text-sm font-medium">{formatINR(p.areaSqYd * p.pricePerSqYd, { compact: true })}</span> },
          ]}
        />
      </div>
    </AppShell>
  );
}
