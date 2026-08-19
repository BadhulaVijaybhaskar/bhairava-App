"use client";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, FilterBar, Metric, PageHeader } from "@/components/kit";
import { byId, customers, formatINR, plots, projects, type Plot } from "@/lib/mock-data";

const views = ["All", "Resale", "Booked", "Registered"];

interface ResaleRow {
  id: string;
  plot: Plot;
  originalValue: number;
  resaleValue: number;
  ageDays: number;
  interest: number;
}

function buildRows(): ResaleRow[] {
  const resale = plots.filter((p) => p.status === "resale");
  const pool = resale.length >= 8 ? resale : plots.filter((p) => p.status === "booked" || p.status === "registered");
  return pool.slice(0, 30).map((p, i) => {
    const originalValue = p.areaSqYd * p.pricePerSqYd;
    const upliftPct = 8 + (i % 11);
    return {
      id: p.id,
      plot: p,
      originalValue,
      resaleValue: Math.round(originalValue * (1 + upliftPct / 100)),
      ageDays: 5 + ((i * 13) % 180),
      interest: (i * 3) % 9,
    };
  });
}

export default function ResalePage() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const rows = useMemo(buildRows, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (active !== "All" && r.plot.status.toLowerCase() !== active.toLowerCase()) return false;
      const project = byId(projects, r.plot.projectId);
      const owner = byId(customers, r.plot.customerId);
      const haystack = `${r.plot.number} ${project?.name ?? ""} ${owner?.name ?? ""}`.toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      return true;
    });
  }, [rows, active, query]);

  const totalResaleValue = rows.reduce((a, r) => a + r.resaleValue, 0);
  const avgUplift =
    rows.reduce((a, r) => a + (r.resaleValue - r.originalValue) / r.originalValue, 0) / (rows.length || 1);
  const totalInterest = rows.reduce((a, r) => a + r.interest, 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inventory"
        title="Resale Inventory"
        description="Secondary-market plots listed by existing owners, with expected uplift and buyer interest."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Resale listings" value={String(rows.length)} hint="active" />
        <Metric label="Total resale value" value={formatINR(totalResaleValue, { compact: true })} />
        <Metric label="Avg expected uplift" value={`+${Math.round(avgUplift * 100)}%`} hint="over original value" />
      </div>

      <div className="pt-6">
        <FilterBar views={views} active={active} onSelect={setActive} query={query} onQuery={setQuery} placeholder="Search plot, project, owner…" />

        <DataTable
          rows={filtered}
          columns={[
            {
              key: "plot",
              header: "Plot",
              cell: (r) => <span className="numeric">{r.plot.number}</span>,
            },
            {
              key: "project",
              header: "Project",
              cell: (r) => byId(projects, r.plot.projectId)?.name ?? "—",
            },
            {
              key: "owner",
              header: "Current owner",
              cell: (r) => byId(customers, r.plot.customerId)?.name ?? "—",
            },
            {
              key: "original",
              header: "Original value",
              align: "right",
              cell: (r) => <span className="numeric">{formatINR(r.originalValue, { compact: true })}</span>,
            },
            {
              key: "resale",
              header: "Expected resale",
              align: "right",
              cell: (r) => (
                <span className="numeric font-medium text-primary">
                  {formatINR(r.resaleValue, { compact: true })}
                </span>
              ),
            },
            {
              key: "age",
              header: "Listed for",
              align: "right",
              cell: (r) => <span className="numeric">{r.ageDays}d</span>,
            },
            {
              key: "interest",
              header: "Buyer interest",
              align: "right",
              cell: (r) => <span className="numeric">{r.interest}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <Chip>{r.plot.status}</Chip>,
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
