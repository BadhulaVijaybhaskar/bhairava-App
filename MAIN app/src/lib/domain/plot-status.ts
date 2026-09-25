/**
 * Canonical plot commercial status (Portfolio OS §13).
 * Legacy mock lowercase values are adapted via toCanonicalPlotStatus / fromCanonicalPlotStatus.
 * No HOLD — administrative unavailability is BLOCKED.
 */

export const PLOT_STATUSES = [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "UNDER_DOCUMENTATION",
  "SOLD",
  "REGISTERED",
  "RESALE_AVAILABLE",
  "BLOCKED",
  "CANCELLED",
] as const;

export type CanonicalPlotStatus = (typeof PLOT_STATUSES)[number];

/** Legacy mock / localStorage spellings still present in seed data and older persisted rows. */
export type LegacyPlotStatus =
  | "available"
  | "reserved"
  | "booked"
  | "registered"
  | "resale"
  | "sold"
  | "hold"
  | "blocked"
  | "cancelled"
  | "under_documentation"
  | "under documentation";

const LEGACY_MAP: Record<string, CanonicalPlotStatus> = {
  available: "AVAILABLE",
  reserved: "RESERVED",
  booked: "BOOKED",
  registered: "REGISTERED",
  resale: "RESALE_AVAILABLE",
  resale_available: "RESALE_AVAILABLE",
  "resale available": "RESALE_AVAILABLE",
  sold: "SOLD",
  hold: "BLOCKED", // HOLD removed — map to administrative BLOCKED
  blocked: "BLOCKED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  under_documentation: "UNDER_DOCUMENTATION",
  "under documentation": "UNDER_DOCUMENTATION",
  underdocumentation: "UNDER_DOCUMENTATION",
};

/** Persist-friendly lowercase for older screens that still expect mock PlotStatus. */
const CANONICAL_TO_LEGACY: Record<CanonicalPlotStatus, string> = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  BOOKED: "booked",
  UNDER_DOCUMENTATION: "booked", // closest legacy bucket for pre-migration writers
  SOLD: "registered", // closest sold-adjacent legacy; prefer canonical in new code
  REGISTERED: "registered",
  RESALE_AVAILABLE: "resale",
  BLOCKED: "available", // never invent hold; blocked inventory was not modeled — keep inventorable
  CANCELLED: "available",
};

export function isCanonicalPlotStatus(value: unknown): value is CanonicalPlotStatus {
  return typeof value === "string" && (PLOT_STATUSES as readonly string[]).includes(value);
}

/**
 * Normalize any stored / mock plot status string to canonical.
 * Unknown values fall back to AVAILABLE (safe inventory default) rather than dropping the plot.
 */
export function toCanonicalPlotStatus(raw: unknown): CanonicalPlotStatus {
  if (isCanonicalPlotStatus(raw)) return raw;
  if (typeof raw !== "string" || !raw.trim()) return "AVAILABLE";
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const spaced = raw.trim().toLowerCase();
  return LEGACY_MAP[key] ?? LEGACY_MAP[spaced] ?? LEGACY_MAP[raw.trim().toLowerCase()] ?? "AVAILABLE";
}

/** For writing back into legacy Plot.status fields used by older routes. */
export function toLegacyPlotStatus(status: CanonicalPlotStatus): LegacyPlotStatus {
  return CANONICAL_TO_LEGACY[status] as LegacyPlotStatus;
}

export const PLOT_STATUS_LABEL: Record<CanonicalPlotStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  BOOKED: "Booked",
  UNDER_DOCUMENTATION: "Under documentation",
  SOLD: "Sold",
  REGISTERED: "Registered",
  RESALE_AVAILABLE: "Resale available",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
};

export function countByCanonicalStatus(
  items: { status: unknown }[],
): Record<CanonicalPlotStatus, number> {
  const counts = Object.fromEntries(PLOT_STATUSES.map((s) => [s, 0])) as Record<
    CanonicalPlotStatus,
    number
  >;
  for (const item of items) {
    const s = toCanonicalPlotStatus(item.status);
    counts[s] += 1;
  }
  return counts;
}
