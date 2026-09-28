import {
  PLOT_STATUS_LABEL,
  canonicalPlotStatusFill,
  canonicalPlotStatusInk,
  canonicalPlotStatusSolid,
  toCanonicalPlotStatus,
  type CanonicalPlotStatus,
} from "@bhairava/domain";

export type { CanonicalPlotStatus };

export interface PlotStatusColors {
  status: CanonicalPlotStatus;
  label: string;
  /** Soft background (chips, layout fills). */
  fill: string;
  /** Legend dot / stroke. */
  solid: string;
  /** Text on `fill`. */
  ink: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Strict match of a label or stored value against the canonical plot statuses
 * (and their legacy spellings). Unlike `toCanonicalPlotStatus`, unknown values
 * return `null` instead of falling back to AVAILABLE, so generic chips like
 * "Pending" keep their tone colors.
 */
export function plotStatusFromLabel(value: unknown): CanonicalPlotStatus | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const canonical = toCanonicalPlotStatus(value);
  if (canonical !== "AVAILABLE") return canonical;
  return normalize(value) === "available" ? canonical : null;
}

export function plotStatusColors(raw: unknown): PlotStatusColors {
  const status = toCanonicalPlotStatus(raw);
  return {
    status,
    label: PLOT_STATUS_LABEL[status],
    fill: canonicalPlotStatusFill[status],
    solid: canonicalPlotStatusSolid[status],
    ink: canonicalPlotStatusInk[status],
  };
}

export function plotStatusLabel(raw: unknown): string {
  return PLOT_STATUS_LABEL[toCanonicalPlotStatus(raw)];
}
