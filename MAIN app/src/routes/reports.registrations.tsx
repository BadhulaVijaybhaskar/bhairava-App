import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, Panel, SectionTitle, Metric, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { useData } from "@/lib/store";
import { formatINR } from "@/lib/mock-data";
import { toCsv } from "@/lib/domain/management-derive";

export const Route = createFileRoute("/reports/registrations")({
  head: () => ({ meta: [{ title: "Registrations Report — Bhairava" }] }),
  component: ReportPage,
});

function ReportPage() {
  const data = useData();
  const [projectId, setProjectId] = useState("All");
  const sourceKey = "opsRegistrations" as const;

  const rows = useMemo(() => {
    const list = ((data as unknown as Record<string, unknown>)[sourceKey] as Array<Record<string, unknown> & { id: string }>) || [];
    return list
      .filter((r) => projectId === "All" || String(r["projectId"] || "") === projectId )
      .map((r) => ({
        id: r.id,
        name: String(r["name"] || r["bookingId"] || r["plotId"] || r.id),
        status: String(r["status"] || r["stage"] || "—"),
        value: Number(r["totalValue"] || r["askingPrice"] || r["amount"] || 0),
      }));
  }, [data, projectId]);

  function download() {
    const csv = toCsv(["id", "name", "status", "value"], rows.map((r) => [r.id, r.name, r.status, r.value]));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report-registrations.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Registrations Report"
        description="Registration pipeline derived from operations cases."
        actions={
          <Btn variant="tonal" onClick={download} data-testid="report-registrations-csv">
            Export CSV
          </Btn>
        }
      />
      <div className="flex flex-wrap gap-2 pb-4">
        {["All", ...data.projects.map((p) => p.id)].map((id) => (
          <button
            key={id}
            onClick={() => setProjectId(id)}
            className={
              id === projectId
                ? "rounded-lg bg-surface-lowest px-3 py-1.5 text-xs font-medium shadow-ambient"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-c"
            }
          >
            {id === "All" ? "All projects" : data.projects.find((p) => p.id === id)?.code || id}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Rows" value={String(rows.length)} />
        <Metric label="Statuses" value={String(new Set(rows.map((r) => r.status)).size)} />
        <Metric label="Value" value={formatINR(rows.reduce((a, r) => a + r.value, 0), { compact: true })} />
      </div>
      <Panel className="mt-6">
        <SectionTitle>Table</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">ID</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 ? "bg-surface/60" : ""}>
                  <td className="px-4 py-3 text-xs">{r.id}</td>
                  <td className="px-4 py-3 text-sm">{r.name}</td>
                  <td className="px-4 py-3"><Chip>{r.status}</Chip></td>
                  <td className="px-4 py-3 numeric text-xs">{formatINR(r.value)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No rows for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
