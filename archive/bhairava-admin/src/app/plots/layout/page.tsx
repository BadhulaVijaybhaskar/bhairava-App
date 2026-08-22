"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Btn, Chip } from "@/components/kit";
import { PlotCanvas, statusFill, statusLabel } from "@/components/plot-canvas";
import { byId, customers, agents, formatINR, plots, projects, type Plot, type PlotStatus } from "@/lib/mock-data";

const ALL_STATUSES = Object.keys(statusFill) as PlotStatus[];

export default function PlotsLayoutPage() {
  const [projectId, setProjectId] = useState<string>("PRJ-01");
  const [hidden, setHidden] = useState<Set<PlotStatus>>(new Set());
  const [showNumbers, setShowNumbers] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const scoped = useMemo(
    () => (projectId === "all" ? plots : plots.filter((p) => p.projectId === projectId)),
    [projectId],
  );

  const selected = byId(plots, selectedId);
  const selectedProject = selected ? byId(projects, selected.projectId) : undefined;
  const selectedCustomer = selected?.customerId ? byId(customers, selected.customerId) : undefined;
  const selectedAgent = selected?.agentId ? byId(agents, selected.agentId) : undefined;

  const counts = useMemo(() => {
    const map: Record<PlotStatus, number> = {
      available: 0,
      reserved: 0,
      booked: 0,
      registered: 0,
      resale: 0,
    };
    for (const p of scoped) map[p.status]++;
    return map;
  }, [scoped]);

  const toggleStatus = (s: PlotStatus) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  return (
    <AppShell bleed>
      <div className="flex flex-col gap-4 p-4 pb-24 lg:h-[calc(100vh-4rem)] lg:flex-row lg:pb-4">
        {/* left control rail */}
        <aside className="order-2 grid w-full shrink-0 gap-4 sm:grid-cols-2 lg:order-1 lg:flex lg:w-64 lg:flex-col lg:overflow-y-auto">

          <div className="panel p-4">
            <p className="pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Project
            </p>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-lg bg-surface-low px-3 py-2 text-sm outline-none"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="panel p-4">
            <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Status layers
            </p>
            <div className="flex flex-col gap-2">
              {ALL_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-low"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: statusFill[s] }} />
                    {statusLabel[s]}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="numeric text-xs text-muted-foreground">{counts[s]}</span>
                    <input
                      type="checkbox"
                      checked={!hidden.has(s)}
                      onChange={() => toggleStatus(s)}
                      className="accent-primary"
                    />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <label className="flex items-center justify-between gap-2 text-sm">
              Show plot numbers
              <input
                type="checkbox"
                checked={showNumbers}
                onChange={(e) => setShowNumbers(e.target.checked)}
                className="accent-primary"
              />
            </label>
          </div>

          <div className="panel-tonal p-4">
            <p className="pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Summary
            </p>
            <p className="numeric text-2xl font-semibold">{scoped.length}</p>
            <p className="text-xs text-muted-foreground">Total plots in view</p>
          </div>
        </aside>

        {/* centre canvas */}
        <div className="order-1 h-[52vh] min-w-0 flex-1 lg:order-2 lg:h-auto">

          <PlotCanvas
            plots={scoped}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.id)}
            hiddenStatuses={hidden}
            showNumbers={showNumbers}
            className="h-full w-full"
          />
        </div>

        {/* right contextual panel */}
        {selected && (
          <aside className="order-3 flex w-full shrink-0 flex-col gap-4 lg:w-80 lg:overflow-y-auto">
            <div className="panel p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {selectedProject?.name ?? "Plot"}
                  </p>
                  <h2 className="numeric font-display text-2xl font-semibold">{selected.number}</h2>
                </div>
                <button
                  onClick={() => setSelectedId(undefined)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-low hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="pt-3">
                <Chip>{statusLabel[selected.status]}</Chip>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Area
                  </p>
                  <p className="numeric pt-1 text-sm font-medium">{selected.areaSqYd} sq.yd</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Facing
                  </p>
                  <p className="pt-1 text-sm font-medium">{selected.facing}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Price / sq.yd
                  </p>
                  <p className="numeric pt-1 text-sm font-medium">{formatINR(selected.pricePerSqYd)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Total price
                  </p>
                  <p className="numeric pt-1 text-sm font-medium">
                    {formatINR(selected.areaSqYd * selected.pricePerSqYd, { compact: true })}
                  </p>
                </div>
              </div>
            </div>

            <div className="panel-tonal p-5">
              <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Linked records
              </p>
              {selectedCustomer ? (
                <Link
                  href={`/customers/${selectedCustomer.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-low"
                >
                  Customer: {selectedCustomer.name}
                </Link>
              ) : (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No customer linked</p>
              )}
              {selectedAgent ? (
                <Link
                  href={`/agents/${selectedAgent.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-low"
                >
                  Agent: {selectedAgent.name}
                </Link>
              ) : (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No agent linked</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Btn variant="primary">Reserve</Btn>
              <Btn variant="tonal">Book</Btn>
              <Btn variant="ghost">Open record</Btn>
            </div>
          </aside>
        )}
      </div>
    </AppShell>
  );
}
