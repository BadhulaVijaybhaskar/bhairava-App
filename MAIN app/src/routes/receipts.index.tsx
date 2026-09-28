import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, SectionTitle, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { useData } from "@/lib/store";
import { formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/receipts/")({
  head: () => ({ meta: [{ title: "Receipts — Bhairava" }] }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { financePayments } = useData();
  return (
    <AppShell>
      <PageHeader eyebrow="Finance" title="Receipts" description="Payment receipts linked to collected payments." />
      <Panel>
        <SectionTitle aside={`${financePayments.length} payments`}>Payment receipts</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Payment</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Amount</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Method</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {financePayments.map((p, i) => {
                const row = p as unknown as unknown as Record<string, unknown> & { id: string; amount: number };
                return (
                  <tr key={p.id} className={i % 2 ? "bg-surface/60" : ""}>
                    <td className="px-4 py-3 text-xs">{p.id}</td>
                    <td className="px-4 py-3 numeric text-xs">{formatINR(Number(p.amount) || 0)}</td>
                    <td className="px-4 py-3 text-xs">{String(row["method"] || "—")}</td>
                    <td className="px-4 py-3"><Chip>{String(row["status"] || "RECORDED")}</Chip></td>
                    <td className="px-4 py-3 text-xs">
                      <Link className="text-primary underline" to="/receipts/$paymentId" params={{ paymentId: p.id }}>Open</Link>
                    </td>
                  </tr>
                );
              })}
              {financePayments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
