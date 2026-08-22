import type { PlotStatus } from "@/lib/mock-data";

/** Solid / legend colors — five distinct families, not shades of blue. */
export const plotStatusSolid: Record<PlotStatus, string> = {
  available: "#4CAF7D",
  reserved: "#F2B84B",
  booked: "#3B82F6",
  registered: "#7657D5",
  resale: "#D85C8A",
};

/** Softer fills for the live plot layout. */
export const plotStatusFill: Record<PlotStatus, string> = {
  available: "#BFE5D1",
  reserved: "#F6D89A",
  booked: "#A9D2FF",
  registered: "#C4B5F4",
  resale: "#F0B6CB",
};

/** Chip / label ink — darker than the solid so amber stays readable. */
export const plotStatusInk: Record<PlotStatus, string> = {
  available: "#2E7A52",
  reserved: "#8A6414",
  booked: "#1D4ED8",
  registered: "#4F3AA8",
  resale: "#9A3A62",
};

export const plotStatusLabel: Record<PlotStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  booked: "Booked",
  registered: "Registered",
  resale: "Resale",
};

const PLOT_STATUS_KEYS = new Set<string>(Object.keys(plotStatusSolid));

export function plotStatusFromLabel(value: string): PlotStatus | null {
  const key = value.trim().toLowerCase();
  return PLOT_STATUS_KEYS.has(key) ? (key as PlotStatus) : null;
}
