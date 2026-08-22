import Link from "next/link";
import type { PlotStatus } from "@prisma/client";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: PlotStatus; className?: string }) {
  const meta = PLOT_STATUS_COLORS[status];
  return (
    <span className={cn("status-pill inline-flex items-center gap-1.5", meta.bg, meta.text, className)}>
      <span className="status-dot" style={{ background: meta.hex }} />
      {meta.label}
    </span>
  );
}

const STATUS_ORDER = Object.keys(PLOT_STATUS_COLORS) as PlotStatus[];

export function PlotStatusLegend({
  projectId,
  activeStatus,
  counts,
}: {
  projectId: string;
  activeStatus?: PlotStatus | null;
  counts?: Partial<Record<PlotStatus, number>>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/projects/${projectId}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
          !activeStatus
            ? "border-primary bg-primary text-white"
            : "border-border/70 bg-white text-muted-foreground hover:border-primary/40",
        )}
      >
        All
        {counts ? (
          <span className={cn("rounded-full px-1.5", !activeStatus ? "bg-white/20" : "bg-[var(--surface-low)]")}>
            {Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)}
          </span>
        ) : null}
      </Link>

      {STATUS_ORDER.map((key) => {
        const meta = PLOT_STATUS_COLORS[key];
        const selected = activeStatus === key;
        const count = counts?.[key] ?? 0;
        const href = selected
          ? `/admin/projects/${projectId}`
          : `/admin/projects/${projectId}?status=${key}`;

        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
              selected
                ? "border-transparent text-white shadow-sm"
                : "border-border/70 bg-white text-muted-foreground hover:border-primary/40",
            )}
            style={
              selected
                ? { background: meta.hex, borderColor: meta.hex }
                : undefined
            }
            title={selected ? `Clear ${meta.label} filter` : `Show ${meta.label} plots`}
          >
            <span
              className="status-dot"
              style={{ background: selected ? "#fff" : meta.hex }}
            />
            {meta.label}
            <span
              className={cn(
                "rounded-full px-1.5",
                selected ? "bg-white/25 text-white" : "bg-[var(--surface-low)] text-muted-foreground",
              )}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
