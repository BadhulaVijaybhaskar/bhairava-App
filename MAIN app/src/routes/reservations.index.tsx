import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LayoutList, KanbanSquare, Search } from "lucide-react";
import { PageHeader, Panel, Chip, DataTable, NewRecordButton } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { byId, formatINR, type Reservation } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reservations/")({
  head: () => ({
    meta: [
      { title: "Reservations — Bhairava" },
      { name: "description", content: "Track plot reservations from hold through expiry and conversion." },
      { property: "og:title", content: "Reservations — Bhairava" },
      { property: "og:description", content: "Track plot reservations from hold through expiry and conversion." },
    ],
  }),
  component: ReservationsPage,
});

const views = ["All", "Active", "Expiring today", "Expired", "Converted"] as const;
type View = (typeof views)[number];

function daysLeft(expiresAt: string) {
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function ReservationsPage() {
  const { reservations, plots, customers, agents } = useData();
  const [view, setView] = useState<View>("All");
  const [mode, setMode] = useState<"table" | "board">("table");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (view !== "All" && r.state !== view) return false;
      if (query) {
        const plot = byId(plots, r.plotId);
        const customer = byId(customers, r.customerId);
        const haystack = `${r.id} ${plot?.number ?? ""} ${customer?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [reservations, plots, customers, view, query]);

  const boardStates: Reservation["state"][] = ["Active", "Expiring today", "Expired", "Converted"];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales"
        title="Reservations"
        description="Holds on plots as customers move from interest to booking."
        actions={<NewRecordButton to="/onboarding/reservation">New reservation</NewRecordButton>}
      />

      <div className="flex flex-wrap items-center gap-2 pb-4">
        {views.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              v === view ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c",
            )}
          >
            {v}
          </button>
        ))}
        <div className="flex-1" />
        <label className="flex h-8 items-center gap-2 rounded-lg bg-surface-low px-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reservations…"
            className="w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex items-center gap-1 rounded-lg bg-surface-low p-1">
          <button
            onClick={() => setMode("table")}
            className={cn("flex h-6 w-6 items-center justify-center rounded-md", mode === "table" ? "bg-surface-lowest shadow-ambient" : "text-muted-foreground")}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setMode("board")}
            className={cn("flex h-6 w-6 items-center justify-center rounded-md", mode === "board" ? "bg-surface-lowest shadow-ambient" : "text-muted-foreground")}
          >
            <KanbanSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {mode === "table" ? (
        <DataTable<Reservation>
          rows={filtered}
          columns={[
            { key: "plot", header: "Plot", cell: (r) => <span className="numeric text-xs font-medium">{byId(plots, r.plotId)?.number ?? r.plotId}</span> },
            { key: "customer", header: "Customer", cell: (r) => <span className="text-xs">{byId(customers, r.customerId)?.name ?? "—"}</span> },
            { key: "agent", header: "Agent", cell: (r) => <span className="text-xs text-muted-foreground">{byId(agents, r.agentId)?.name ?? "—"}</span> },
            { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="numeric text-xs">{formatINR(r.amount, { compact: true })}</span> },
            { key: "created", header: "Created", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.createdAt}</span> },
            { key: "expires", header: "Expires", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.expiresAt}</span> },
            {
              key: "countdown",
              header: "Countdown",
              align: "right",
              cell: (r) => {
                const d = daysLeft(r.expiresAt);
                return (
                  <span className={cn("numeric text-xs", d < 0 ? "text-destructive" : d === 0 ? "text-warning-foreground" : "text-muted-foreground")}>
                    {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "today" : `${d}d left`}
                  </span>
                );
              },
            },
            { key: "state", header: "State", cell: (r) => <Chip>{r.state}</Chip> },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {boardStates.map((state) => {
            const items = filtered.filter((r) => r.state === state);
            return (
              <Panel key={state} tonal className="p-3">
                <div className="flex items-center justify-between px-1 pb-3">
                  <p className="text-xs font-semibold">{state}</p>
                  <span className="numeric text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((r) => {
                    const plot = byId(plots, r.plotId);
                    const customer = byId(customers, r.customerId);
                    const d = daysLeft(r.expiresAt);
                    return (
                      <div key={r.id} className="rounded-lg bg-surface-low p-3">
                        <div className="flex items-center justify-between">
                          <span className="numeric text-xs font-medium">{plot?.number ?? r.plotId}</span>
                          <span className="numeric text-[10px] text-muted-foreground">{formatINR(r.amount, { compact: true })}</span>
                        </div>
                        <p className="truncate pt-1 text-xs text-muted-foreground">{customer?.name ?? "—"}</p>
                        <p className={cn("numeric pt-1.5 text-[11px]", d < 0 ? "text-destructive" : d === 0 ? "text-warning-foreground" : "text-muted-foreground")}>
                          {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "expires today" : `${d}d left`}
                        </p>
                      </div>
                    );
                  })}
                  {items.length === 0 && <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">None</p>}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
