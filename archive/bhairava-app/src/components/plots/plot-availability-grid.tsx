import Link from "next/link";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import type { PlotStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export type PlotTileData = {
  id: string;
  plotNumber: string;
  status: PlotStatus;
  customerName?: string | null;
};

export function PlotAvailabilityGrid({
  plots,
  projectId,
}: {
  plots: PlotTileData[];
  projectId: string;
}) {
  if (plots.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No plots in this project yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {plots.map((plot) => {
        const meta = PLOT_STATUS_COLORS[plot.status];
        return (
          <Link
            key={plot.id}
            href={`/admin/plots/${plot.id}?projectId=${projectId}`}
            className={cn(
              "group relative flex min-h-[72px] flex-col items-center justify-center rounded-2xl border px-2 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-md",
            )}
            style={{
              background: `${meta.hex}22`,
              borderColor: `${meta.hex}66`,
            }}
            title={`${plot.plotNumber} · ${meta.label}${plot.customerName ? ` · ${plot.customerName}` : ""}`}
          >
            <span
              className="absolute left-2 top-2 h-2 w-2 rounded-full"
              style={{ background: meta.hex }}
            />
            <span className="text-sm font-bold text-foreground">{plot.plotNumber}</span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: meta.hex }}>
              {meta.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
