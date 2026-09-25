import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Btn, Chip } from "@/components/kit";
import { PlotCanvas } from "@/components/plot-canvas";
import { byId, formatINR } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  PLOT_STATUSES,
  PLOT_STATUS_LABEL,
  type CanonicalPlotStatus,
  toCanonicalPlotStatus,
  countByCanonicalStatus,
} from "@/lib/domain/plot-status";
import { canonicalPlotStatusFill } from "@/lib/plot-status-colors";
import {
  projectPlotForRole,
  customerDisplayName,
} from "@/lib/domain/plot-pii";

export const Route = createFileRoute("/plots/layout")({
  validateSearch: (search: Record<string, unknown>): { projectId?: string } => {
    const projectId = typeof search["projectId"] === "string" ? search["projectId"] : undefined;
    return projectId ? { projectId } : {};
  },
  head: () => ({
    meta: [
      { title: "Live Plot Layout — Bhairava" },
      {
        name: "description",
        content:
          "Interactive live layout map of all plots across projects with status, pricing and contextual actions.",
      },
      { property: "og:title", content: "Live Plot Layout — Bhairava" },
    ],
  }),
  component: PlotsLayoutPage,
});

function PlotsLayoutPage() {
  const { plots, projects, customers, agents } = useData();
  const session = getSession();
  const search = Route.useSearch();
  const [projectId, setProjectId] = useState<string>(search.projectId ?? "PRJ-01");
  const [hidden, setHidden] = useState<Set<CanonicalPlotStatus>>(new Set());
  const [showNumbers, setShowNumbers] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const scoped = useMemo(
    () => (projectId === "all" ? plots : plots.filter((p) => p.projectId === projectId)),
    [projectId, plots],
  );

  const layoutImageUrl =
    projectId !== "all" ? byId(projects, projectId)?.layoutImage : undefined;

  const selected = byId(plots, selectedId);
  const selectedProject = selected ? byId(projects, selected.projectId) : undefined;
  const projected = selected
    ? projectPlotForRole(selected, {
        role: session?.role,
        sessionEmail: session?.email,
        customers,
        agentEmailToId: Object.fromEntries(
          agents.filter((a) => a.email).map((a) => [a.email!.toLowerCase(), a.id]),
        ),
      })
    : null;
  const selectedAgent = selected?.agentId ? byId(agents, selected.agentId) : undefined;

  const counts = useMemo(() => countByCanonicalStatus(scoped), [scoped]);

  const toggleStatus = (s: CanonicalPlotStatus) => {
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
            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {PLOT_STATUSES.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-low"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: canonicalPlotStatusFill[s] }}
                    />
                    {PLOT_STATUS_LABEL[s]}
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

        <div className="order-1 h-[52vh] min-w-0 flex-1 lg:order-2 lg:h-auto">
          <PlotCanvas
            plots={scoped}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.id)}
            hiddenStatuses={hidden}
            showNumbers={showNumbers}
            layoutImageUrl={layoutImageUrl ?? null}
            className="h-full w-full"
          />
        </div>

        {selected && projected && (
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
                  type="button"
                  onClick={() => setSelectedId(undefined)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-low hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="pt-3">
                <Chip>{PLOT_STATUS_LABEL[projected.canonical]}</Chip>
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
                  <p className="numeric pt-1 text-sm font-medium">
                    {formatINR(selected.pricePerSqYd)}
                  </p>
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
              {projected.customerView ? (
                <div className="rounded-lg px-2 py-1.5 text-sm">
                  <p>
                    Customer:{" "}
                    {projected.customerView.redacted && !projected.customerView.name ? (
                      <span className="italic text-muted-foreground">
                        {customerDisplayName(projected.customerView)}
                      </span>
                    ) : (
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: projected.customerView.id }}
                        className="font-medium hover:underline"
                      >
                        {customerDisplayName(projected.customerView)}
                      </Link>
                    )}
                  </p>
                  {projected.customerView.phone && (
                    <p className="text-xs text-muted-foreground">{projected.customerView.phone}</p>
                  )}
                </div>
              ) : (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">No customer linked</p>
              )}
              {selectedAgent ? (
                <Link
                  to="/agents/$agentId"
                  params={{ agentId: selectedAgent.id }}
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
