import type { PlotStatus } from "@prisma/client";

/** Server-side plot status machine (Admin Platform Plan). */
const TRANSITIONS: Record<PlotStatus, PlotStatus[]> = {
  AVAILABLE: ["RESERVED", "BLOCKED"],
  RESERVED: ["BOOKED", "AVAILABLE"],
  BOOKED: ["UNDER_DOCUMENTATION", "CANCELLED"],
  UNDER_DOCUMENTATION: ["SOLD", "CANCELLED"],
  SOLD: ["REGISTERED"],
  REGISTERED: ["RESALE_AVAILABLE"],
  RESALE_AVAILABLE: ["BOOKED"],
  BLOCKED: ["AVAILABLE"],
  CANCELLED: ["AVAILABLE"],
};

export function nextPlotStatuses(from: PlotStatus): PlotStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransitionPlot(from: PlotStatus, to: PlotStatus): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}
