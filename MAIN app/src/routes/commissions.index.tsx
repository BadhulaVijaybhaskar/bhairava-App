import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader, Panel, SectionTitle, Chip, Metric } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { useData } from "@/lib/store";
import { formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/commissions/")({
  head: () => ({ meta: [{ title: "Commissions — Bhairava" }] }),
  component: CommissionsPage,
});

function CommissionsPage() {
  const { commissions, agents } = useData();
  const total = useMemo(
    () => commissions.reduce((a, c) => a + Number((c as unknown as Record<string, unknown>)["amount"] ?? (c as unknown as Record<string, unknown>)["commissionAmount"] ?? 0), 0),
    [commissions],
  );
  return (
    <AppShell>
      <PageHeader eyebrow="Finance" title="Commissions" description="Commission records derived from bookings and rules." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Records" value={String(commissions.length)} />
        <Metric label="Total amount" value={formatINR(total, { compact: true })} />
        <Metric label="Agents" value={String(new Set(commissions.map((c) => c.agentId)).size)} />
      </div>
      <Panel className="mt-6">
        <SectionTitle>Commission ledger</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">ID</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Agent</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Amount</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c, i) => {
                const row = c as unknown as unknown as Record<string, unknown> & { id: string; agentId: string };
                const amount = Number(row["amount"] ?? row["commissionAmount"] ?? 0);
                return (
                  <tr key={c.id} className={i % 2 ? "bg-surface/60" : ""}>
                    <td className="px-4 py-3 text-xs">{c.id}</td>
                    <td className="px-4 py-3 text-xs">{agents.find((a) => a.id === c.agentId)?.name || c.agentId}</td>
                    <td className="px-4 py-3 numeric text-xs">{formatINR(amount)}</td>
                    <td className="px-4 py-3"><Chip>{String(row["status"] || "PENDING")}</Chip></td>
                  </tr>
                );
              })}
              {commissions.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No commissions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
