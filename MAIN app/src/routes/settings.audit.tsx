import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { useData } from "@/lib/store";
import { useManagement } from "@/lib/management-store";
import { deriveOperationalAudit } from "@/lib/domain/management-derive";
import { filterAuditEvents, type AuditEvent } from "@/lib/domain/management";

export const Route = createFileRoute("/settings/audit")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Bhairava" },
      { name: "description", content: "Real audit trail from member actions and operational records." },
    ],
  }),
  component: AuditSettings,
});

function AuditSettings() {
  const data = useData();
  const mgmt = useManagement();
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const derived = useMemo(
    () =>
      deriveOperationalAudit({
        bookings: data.bookings as never,
        reservations: data.reservations as never,
        cancelRequests: data.cancelRequests as never,
        financePayments: data.financePayments as never,
        paymentSchedules: data.paymentSchedules as never,
        opsDocuments: data.opsDocuments as never,
        opsRegistrations: data.opsRegistrations as never,
        opsResales: data.opsResales as never,
      }),
    [data],
  );

  const combined: AuditEvent[] = useMemo(() => {
    const map = new Map<string, AuditEvent>();
    for (const e of derived) map.set(e.id, e);
    for (const e of mgmt.auditEvents) map.set(e.id, e);
    return [...map.values()].sort((a, b) => b.at.localeCompare(a.at));
  }, [derived, mgmt.auditEvents]);

  const actions = useMemo(() => Array.from(new Set(combined.map((a) => a.action))).sort(), [combined]);
  const actors = useMemo(() => Array.from(new Set(combined.map((a) => a.actorEmail))).sort(), [combined]);
  const filtered = useMemo(
    () => filterAuditEvents(combined, { actor, action, ...(from ? { from } : {}), ...(to ? { to } : {}) }),
    [combined, actor, action, from, to],
  );

  function exportCsv() {
    const lines = [
      ["timestamp", "actor", "action", "entity", "entityId", "summary", "before", "after"].join(","),
      ...filtered.map((a) =>
        [a.at, a.actorEmail, a.action, a.entityType, a.entityId, a.summary, a.before ?? "", a.after ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "bhairava-audit.csv";
    el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Audit logs"
        description="Member/management events plus operational records derived from workspace data — no synthetic rows."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1">
          <Panel data-testid="audit-panel">
            <SectionTitle
              aside={
                <Btn variant="tonal" onClick={exportCsv} data-testid="audit-export">
                  <Download className="h-4 w-4" /> Export CSV
                </Btn>
              }
            >
              Activity ({filtered.length})
            </SectionTitle>
            <div className="flex flex-wrap items-center gap-2 pb-4">
              <select value={actor} onChange={(e) => setActor(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" data-testid="audit-filter-actor">
                <option>All</option>
                {actors.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" data-testid="audit-filter-action">
                <option>All</option>
                {actions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" data-testid="audit-filter-from" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" data-testid="audit-filter-to" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="rounded-l-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Timestamp</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Actor</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Action</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Entity</th>
                    <th className="rounded-r-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Before → After</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className={i % 2 === 1 ? "bg-surface/60" : ""} data-testid={`audit-row-${a.id}`}>
                      <td className="numeric px-4 py-3 text-xs whitespace-nowrap">{a.at}</td>
                      <td className="px-4 py-3 text-sm">{a.actorEmail}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.action}</td>
                      <td className="px-4 py-3 text-xs">
                        {a.entityType}/{a.entityId}
                        <div className="text-muted-foreground">{a.summary}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-muted-foreground">{a.before ?? "—"}</span> → <span className="font-medium">{a.after ?? "—"}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No activity matches these filters. Invite a member or save company settings to append a live audit row.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
