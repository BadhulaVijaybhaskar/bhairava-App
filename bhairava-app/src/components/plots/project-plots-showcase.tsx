"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import type { PlotStatus } from "@prisma/client";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ShowcasePlot = {
  id: string;
  plotNumber: string;
  status: PlotStatus;
  customerName?: string | null;
  blockName?: string | null;
};

type ViewMode = "compact" | "grid" | "list";

export function ProjectPlotsShowcase({
  plots,
  projectId,
}: {
  plots: ShowcasePlot[];
  projectId: string;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>(plots.length > 40 ? "compact" : "grid");
  const [groupByBlock, setGroupByBlock] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plots;
    return plots.filter(
      (p) =>
        p.plotNumber.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q) ||
        p.blockName?.toLowerCase().includes(q),
    );
  }, [plots, query]);

  const groups = useMemo(() => {
    if (!groupByBlock) {
      return [{ key: "all", label: "All plots", items: filtered }];
    }
    const map = new Map<string, ShowcasePlot[]>();
    for (const plot of filtered) {
      const key = plot.blockName?.trim() || "Unassigned block";
      const list = map.get(key) ?? [];
      list.push(plot);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ key: label, label, items }));
  }, [filtered, groupByBlock]);

  if (plots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No plots match this filter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search plot no., block, or customer"
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={groupByBlock}
              onChange={(e) => setGroupByBlock(e.target.checked)}
              className="accent-[var(--brand)]"
            />
            Group by block
          </label>
          <div className="inline-flex rounded-xl border border-border bg-white p-1">
            {(
              [
                ["compact", "Compact"],
                ["grid", "Grid"],
                ["list", "List"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                  view === mode ? "bg-primary text-white" : "text-muted-foreground hover:bg-[var(--surface-low)]",
                )}
              >
                {mode === "list" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {plots.length} plots
        {plots.length >= 15
          ? " · Compact view + search works well for acre / multi-block projects"
          : null}
      </p>

      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          {groupByBlock ? (
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">{group.label}</h4>
              <span className="text-xs font-semibold text-muted-foreground">{group.items.length} plots</span>
            </div>
          ) : null}

          {view === "list" ? (
            <ul className="space-y-0 overflow-hidden rounded-2xl border border-border/70 bg-white">
              {group.items.map((plot) => {
                const meta = PLOT_STATUS_COLORS[plot.status];
                return (
                  <li key={plot.id}>
                    <Link
                      href={`/admin/plots/${plot.id}?projectId=${projectId}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--surface-low)]/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="status-dot" style={{ background: meta.hex }} />
                        <div>
                          <p className="text-sm font-bold text-foreground">{plot.plotNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {plot.customerName || "No customer"}
                            {plot.blockName ? ` · ${plot.blockName}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: meta.hex }}>
                        {meta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div
              className={cn(
                "grid gap-1.5",
                view === "compact"
                  ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
                  : "grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
              )}
            >
              {group.items.map((plot) => {
                const meta = PLOT_STATUS_COLORS[plot.status];
                return (
                  <Link
                    key={plot.id}
                    href={`/admin/plots/${plot.id}?projectId=${projectId}`}
                    className={cn(
                      "relative flex flex-col items-center justify-center border text-center transition hover:-translate-y-0.5 hover:shadow-md",
                      view === "compact"
                        ? "min-h-[52px] rounded-xl px-1 py-1.5"
                        : "min-h-[72px] rounded-2xl px-2 py-3",
                    )}
                    style={{
                      background: `${meta.hex}22`,
                      borderColor: `${meta.hex}66`,
                    }}
                    title={`${plot.plotNumber} · ${meta.label}${plot.customerName ? ` · ${plot.customerName}` : ""}`}
                  >
                    <span
                      className={cn(
                        "absolute rounded-full",
                        view === "compact" ? "left-1 top-1 h-1.5 w-1.5" : "left-2 top-2 h-2 w-2",
                      )}
                      style={{ background: meta.hex }}
                    />
                    <span
                      className={cn(
                        "font-bold text-foreground",
                        view === "compact" ? "text-xs" : "text-sm",
                      )}
                    >
                      {plot.plotNumber}
                    </span>
                    {view !== "compact" ? (
                      <span
                        className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: meta.hex }}
                      >
                        {meta.label}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
