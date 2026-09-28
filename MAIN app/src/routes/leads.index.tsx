import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, SectionTitle, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/leads/")({
  head: () => ({ meta: [{ title: "Leads — Bhairava" }] }),
  component: LeadsPage,
});

function LeadsPage() {
  const { leads, projects } = useData();
  return (
    <AppShell>
      <PageHeader eyebrow="Sales" title="Leads" description="Sales leads across projects." />
      <Panel>
        <SectionTitle aside={`${leads.length} leads`}>All leads</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Lead</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Stage</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase text-muted-foreground">Project</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => {
                const row = l as unknown as unknown as Record<string, unknown> & { id: string; name: string };
                return (
                  <tr key={l.id} className={i % 2 ? "bg-surface/60" : ""}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{String(row["phone"] || row["email"] || l.id)}</p>
                    </td>
                    <td className="px-4 py-3"><Chip>{String(row["stage"] || row["status"] || "New")}</Chip></td>
                    <td className="px-4 py-3 text-xs">{projects.find((p) => p.id === row["projectId"])?.code || String(row["projectId"] || "—")}</td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
