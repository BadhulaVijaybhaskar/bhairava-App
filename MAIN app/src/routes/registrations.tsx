import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionTitle, DataTable, Chip } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { byId, type Registration } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/registrations")({
  head: () => ({
    meta: [
      { title: "Registrations Pipeline — Bhairava" },
      {
        name: "description",
        content:
          "Track every plot registration from documentation through sub-registrar completion.",
      },
      { property: "og:title", content: "Registrations Pipeline — Bhairava" },
      {
        property: "og:description",
        content:
          "Track every plot registration from documentation through sub-registrar completion.",
      },
    ],
  }),
  component: RegistrationsPage,
});

const stages: Registration["stage"][] = ["Documentation", "Ready", "Scheduled", "Completed"];

function RegistrationsPage() {
  const { registrations, customers, plots, saveRegistration } = useData();
  const [view, setView] = useState<"board" | "table">("board");

  const byStage = useMemo(() => {
    const map = new Map<Registration["stage"], Registration[]>();
    stages.forEach((s) => map.set(s, []));
    registrations.forEach((r) => map.get(r.stage)?.push(r));
    return map;
  }, [registrations]);

  const moveStage = (r: Registration, stage: Registration["stage"]) => {
    if (r.stage === stage) return;
    saveRegistration({ ...r, stage });
    toast.success(`Moved to ${stage}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales · Registrations"
        title="Registrations Pipeline"
        description="Move plots from documentation to completed registration."
        actions={
          <div className="flex items-center gap-1 rounded-lg bg-surface-low p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "board" ? "bg-surface-lowest shadow-ambient" : "text-muted-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === "table" ? "bg-surface-lowest shadow-ambient" : "text-muted-foreground",
              )}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        }
      />

      {view === "board" ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {stages.map((stage) => {
            const rows = byStage.get(stage) ?? [];
            return (
              <div key={stage} className="panel-tonal p-4">
                <SectionTitle aside={<span className="numeric">{rows.length}</span>}>
                  {stage}
                </SectionTitle>
                <div className="space-y-2.5">
                  {rows.map((r) => {
                    const customer = byId(customers, r.customerId);
                    const plot = byId(plots, r.plotId);
                    return (
                      <DropdownMenu key={r.id}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-full rounded-lg bg-surface p-3 text-left shadow-ambient hover:bg-surface-low"
                          >
                            <p className="truncate text-sm font-medium">{customer?.name ?? "—"}</p>
                            <p className="numeric pt-0.5 text-xs text-muted-foreground">
                              {plot?.number ?? r.plotId}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <span className="numeric text-[11px] text-muted-foreground">
                                {r.slot}
                              </span>
                            </div>
                            <p className="pt-1 text-[11px] text-muted-foreground">
                              {r.subRegistrar} SRO
                            </p>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {stages.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              disabled={s === r.stage}
                              onClick={() => moveStage(r, s)}
                            >
                              Move to {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })}
                  {rows.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      No registrations
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          rows={registrations}
          columns={[
            {
              key: "id",
              header: "Registration",
              cell: (r) => <span className="numeric text-sm font-medium">{r.id}</span>,
            },
            {
              key: "customer",
              header: "Customer",
              cell: (r) => (
                <span className="text-sm">{byId(customers, r.customerId)?.name ?? "—"}</span>
              ),
            },
            {
              key: "plot",
              header: "Plot",
              cell: (r) => (
                <span className="numeric text-sm">{byId(plots, r.plotId)?.number ?? r.plotId}</span>
              ),
            },
            {
              key: "stage",
              header: "Stage",
              cell: (r) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button">
                      <Chip>{r.stage}</Chip>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {stages.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => moveStage(r, s)}>
                        {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
            {
              key: "slot",
              header: "Slot",
              cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.slot}</span>,
            },
            {
              key: "sro",
              header: "Sub-registrar",
              cell: (r) => <span className="text-sm text-muted-foreground">{r.subRegistrar}</span>,
            },
          ]}
        />
      )}
    </AppShell>
  );
}
