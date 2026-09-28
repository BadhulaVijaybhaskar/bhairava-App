/**
 * Canonical corner codes (Portfolio OS §13): NONE | NE | NW | SE | SW.
 * Legacy mock labels map at the edge.
 */

export const CORNER_CODES = ["NONE", "NE", "NW", "SE", "SW"] as const;
export type CanonicalCorner = (typeof CORNER_CODES)[number];

export const CORNER_LABEL: Record<CanonicalCorner, string> = {
  NONE: "None",
  NE: "North-East",
  NW: "North-West",
  SE: "South-East",
  SW: "South-West",
};

const LEGACY_CORNER: Record<string, CanonicalCorner> = {
  none: "NONE",
  "not corner": "NONE",
  "not_corner": "NONE",
  ne: "NE",
  "north-east": "NE",
  "north_east": "NE",
  "north east": "NE",
  nw: "NW",
  "north-west": "NW",
  "north_west": "NW",
  "north west": "NW",
  se: "SE",
  "south-east": "SE",
  "south_east": "SE",
  "south east": "SE",
  sw: "SW",
  "south-west": "SW",
  "south_west": "SW",
  "south west": "SW",
};

export function toCanonicalCorner(raw: unknown): CanonicalCorner {
  if (typeof raw === "string" && (CORNER_CODES as readonly string[]).includes(raw)) {
    return raw as CanonicalCorner;
  }
  if (typeof raw !== "string" || !raw.trim()) return "NONE";
  const key = raw.trim().toLowerCase();
  return LEGACY_CORNER[key] ?? LEGACY_CORNER[key.replace(/[\s_]+/g, "-")] ?? "NONE";
}

export function cornerIsPremium(raw: unknown): boolean {
  return toCanonicalCorner(raw) !== "NONE";
}

/** Legacy CornerType string for older InventoryPlot writers. */
export function toLegacyCornerLabel(code: CanonicalCorner): string {
  switch (code) {
    case "NE":
      return "North-East";
    case "NW":
      return "North-West";
    case "SE":
      return "South-East";
    case "SW":
      return "South-West";
    default:
      return "Not corner";
  }
}

/** UI alias */
