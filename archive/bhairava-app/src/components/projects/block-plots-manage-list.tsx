"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { bulkDeleteBlockPlots } from "@/app/admin/projects/block-actions";
import { formatFacing } from "@/lib/block-plot-specs";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BlockPlotRow = {
  id: string;
  plotNumber: string;
  area: number;
  facing: string | null;
  pricePerSqYard: number | null;
  additionalCharges: number;
  totalPrice: number;
  status: string;
  locked: boolean;
};

export function BlockPlotsManageList({
  projectId,
  blockId,
  plots,
}: {
  projectId: string;
  blockId: string;
  plots: BlockPlotRow[];
}) {
  const areaOptions = useMemo(() => {
    const set = new Set(plots.map((p) => p.area).filter((a) => a > 0));
    return Array.from(set).sort((a, b) => a - b);
  }, [plots]);

  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    if (areaFilter === "all") return plots;
    const area = Number(areaFilter);
    return plots.filter((p) => p.area === area);
  }, [plots, areaFilter]);

  const selectableVisible = visible.filter((p) => !p.locked);
  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((p) => selected.has(p.id));

  function toggleOne(id: string, locked: boolean) {
    if (locked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const p of selectableVisible) next.delete(p.id);
      } else {
        for (const p of selectableVisible) next.add(p.id);
      }
      return next;
    });
  }

  function selectAllByArea() {
    if (areaFilter === "all") {
      setSelected(new Set(plots.filter((p) => !p.locked).map((p) => p.id)));
      return;
    }
    setSelected(new Set(selectableVisible.map((p) => p.id)));
  }

  const selectedCount = selected.size;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div>
          <h3 className="font-semibold text-foreground">
            Plots in this block ({plots.length})
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Check plots to delete · filter by area · booked plots stay locked
          </p>
        </div>
        <label className="block text-xs font-semibold text-muted-foreground">
          Filter by area
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="input-field mt-1 !pl-3 min-w-[140px]"
          >
            <option value="all">All sizes</option>
            {areaOptions.map((a) => (
              <option key={a} value={String(a)}>
                {a} sq.yd
              </option>
            ))}
          </select>
        </label>
      </div>

      {plots.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No plots yet. Save size rows, then click Generate.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-canvas/60 px-5 py-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                disabled={selectableVisible.length === 0}
                className="h-4 w-4 rounded border-border text-primary focus:ring-brand"
              />
              Select all{areaFilter !== "all" ? ` (${areaFilter} sq.yd)` : " visible"}
            </label>
            <button
              type="button"
              onClick={selectAllByArea}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-[var(--surface-low)]"
            >
              {areaFilter === "all" ? "Select all deletable" : `Select all ${areaFilter} sq.yd`}
            </button>
            <span className="text-xs text-muted-foreground">
              Showing {visible.length}
              {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
            </span>
          </div>

          <form action={bulkDeleteBlockPlots}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="blockId" value={blockId} />

            <ul className="space-y-0">
              {visible.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-2.5 text-sm",
                      checked && "bg-red-50/60",
                      p.locked && "opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="plotIds"
                      value={p.id}
                      checked={checked}
                      disabled={p.locked}
                      onChange={() => toggleOne(p.id, p.locked)}
                      className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-brand"
                      title={p.locked ? "Has active booking — cannot delete" : "Select to delete"}
                    />
                    <Link
                      href={`/admin/plots/${p.id}?projectId=${projectId}`}
                      className="min-w-0 flex-1 hover:text-primary"
                    >
                      <span className="font-semibold text-foreground">{p.plotNumber}</span>
                      <span className="mt-0.5 block text-muted-foreground sm:mt-0 sm:inline sm:before:content-['·_']">
                        {p.area > 0 ? `${p.area} sq.yd` : "No area"} · {formatFacing(p.facing as never)}{" "}
                        ·{" "}
                        {p.pricePerSqYard != null
                          ? `${formatINR(p.pricePerSqYard)}/sq.yd`
                          : "No rate"}
                        {p.additionalCharges > 0
                          ? ` · +${formatINR(p.additionalCharges)}`
                          : ""}{" "}
                        · {p.totalPrice > 0 ? formatINR(p.totalPrice) : "No price"}
                        {p.locked ? " · Booked" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No plots match this area filter.</p>
            ) : null}

            <div className="border-t border-border/70 px-5 py-4">
              <button
                type="submit"
                disabled={selectedCount === 0}
                onClick={(e) => {
                  if (
                    selectedCount > 0 &&
                    !window.confirm(
                      `Delete ${selectedCount} selected plot${selectedCount === 1 ? "" : "s"}?`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ""}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
