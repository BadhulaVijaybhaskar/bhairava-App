import type {
  CornerType,
  Facing,
  InventoryPlot,
  PlotType,
  PricingRules,
  Project,
  ProjectAmenity,
} from "@/lib/mock-data";

export const FACINGS: Facing[] = ["North", "South", "East", "West"];

export const CORNER_TYPES: CornerType[] = [
  "Not corner",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];

export const PLOT_FEATURES = [
  "Park facing",
  "Main road facing",
  "Avenue facing",
  "Entrance facing",
  "Commercial facing",
  "Open space facing",
  "Clubhouse facing",
  "Premium location",
  "Irregular plot",
] as const;

export const PROJECT_TYPES = [
  "Plotted development",
  "Villa plots",
  "Farm plots",
  "Commercial plots",
] as const;

export const PROJECT_STATUSES = ["Draft", "Pre-launch", "Active", "On hold", "Sold out"] as const;

export const AREA_UNITS = ["Acres", "Sq Yards", "Sq Ft", "Hectares"] as const;

export const AMENITY_CATALOG: { group: string; items: string[] }[] = [
  {
    group: "Infrastructure",
    items: [
      "Internal roads",
      "Blacktop / CC roads",
      "Underground drainage",
      "Electricity",
      "Streetlights",
      "Water supply",
      "Underground cabling",
      "Rainwater drainage",
    ],
  },
  {
    group: "Community",
    items: [
      "Entrance arch",
      "Security",
      "Compound wall",
      "Parks",
      "Children's play area",
      "Walking track",
      "Clubhouse",
      "Open gym",
      "Community area",
    ],
  },
  {
    group: "Landscape",
    items: ["Avenue plantation", "Landscaping", "Green belt", "Central park"],
  },
  {
    group: "Connectivity",
    items: [
      "Nearby highway",
      "Schools",
      "Hospitals",
      "Airport",
      "Railway station",
      "Business district",
      "Capital region",
    ],
  },
];

export const defaultPricing = (): PricingRules => ({
  baseRatePerSqYd: 25000,
  facingPremium: { East: 1000, North: 750, West: 0, South: 0 },
  cornerPremium: 1500,
  featurePremium: {
    "Park facing": 750,
    "Main road facing": 1000,
    "Avenue facing": 500,
    "Premium location": 1200,
  },
});

export const PLOT_TYPE_PRESETS: Omit<PlotType, "id">[] = [
  { name: "Type A", areaSqYd: 100, lengthFt: 45, widthFt: 20, facingAllowed: ["East", "West"], category: "Standard" },
  { name: "Type B", areaSqYd: 150, lengthFt: 45, widthFt: 30, facingAllowed: [...FACINGS], category: "Standard" },
  { name: "Type C", areaSqYd: 200, lengthFt: 60, widthFt: 30, facingAllowed: [...FACINGS], category: "Premium" },
  { name: "Type D", areaSqYd: 267, lengthFt: 60, widthFt: 40, facingAllowed: ["North", "East"], category: "Premium" },
];

export const amenityFromName = (name: string, group: string): ProjectAmenity => ({
  id: `AMN-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  group,
  status: "Planned",
  completion: 0,
  photos: 0,
});

/* --------------------------------- pricing -------------------------------- */

export interface RateLine {
  label: string;
  amount: number;
}

export function rateBreakdown(plot: InventoryPlot, rules: PricingRules): RateLine[] {
  if (plot.rateOverride != null) return [{ label: "Manual override", amount: plot.rateOverride }];
  const lines: RateLine[] = [{ label: "Base rate", amount: rules.baseRatePerSqYd }];
  const facing = rules.facingPremium[plot.facing] ?? 0;
  if (facing) lines.push({ label: `${plot.facing} facing premium`, amount: facing });
  if (plot.corner !== "Not corner" && rules.cornerPremium)
    lines.push({ label: `${plot.corner} corner premium`, amount: rules.cornerPremium });
  for (const f of plot.features) {
    const amt = rules.featurePremium[f] ?? 0;
    if (amt) lines.push({ label: `${f} premium`, amount: amt });
  }
  return lines;
}

export const finalRate = (plot: InventoryPlot, rules: PricingRules): number =>
  rateBreakdown(plot, rules).reduce((sum, l) => sum + l.amount, 0);

export const plotTotal = (plot: InventoryPlot, rules: PricingRules): number =>
  finalRate(plot, rules) * plot.areaSqYd;

/* ------------------------------ setup progress ----------------------------- */

export interface SetupTask {
  key: string;
  label: string;
  done: boolean;
  tab: string;
}

export function setupTasks(project: Project): SetupTask[] {
  return [
    { key: "basics", label: "Project information", done: !!project.name && !!project.code, tab: "Overview" },
    { key: "location", label: "Location details", done: !!project.location && !!project.city, tab: "Overview" },
    { key: "types", label: "Plot types defined", done: (project.plotTypes?.length ?? 0) > 0, tab: "Plot Configuration" },
    { key: "inventory", label: "Plot inventory created", done: (project.inventory?.length ?? 0) > 0, tab: "Layout & Inventory" },
    { key: "layout", label: "Master layout uploaded", done: !!project.layoutImage, tab: "Layout & Inventory" },
    { key: "pricing", label: "Pricing rules set", done: (project.pricing?.baseRatePerSqYd ?? 0) > 0, tab: "Pricing" },
    { key: "amenities", label: "Amenities selected", done: (project.amenities?.length ?? 0) > 0, tab: "Amenities" },
    { key: "docs", label: "Approvals recorded", done: project.approvals.length > 0, tab: "Documents" },
    { key: "team", label: "Sales team assigned", done: (project.agents?.length ?? 0) > 0, tab: "Sales Team" },
    { key: "settings", label: "Booking rules configured", done: !!project.settings, tab: "Settings" },
  ];
}

export const setupPercent = (project: Project): number => {
  const tasks = setupTasks(project);
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
};

/* ------------------------------- inventory mix ----------------------------- */

export function inventoryMix(inventory: InventoryPlot[]) {
  const count = <T extends string | number>(fn: (p: InventoryPlot) => T) => {
    const map = new Map<T, number>();
    for (const p of inventory) map.set(fn(p), (map.get(fn(p)) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => Number(b[1]) - Number(a[1]));
  };
  return {
    byArea: count((p) => p.areaSqYd),
    byFacing: count((p) => p.facing),
    byStatus: count((p) => p.status),
    corner: inventory.filter((p) => p.corner !== "Not corner").length,
    parkFacing: inventory.filter((p) => p.features.includes("Park facing")).length,
    mainRoad: inventory.filter((p) => p.features.includes("Main road facing")).length,
  };
}

/** Generate a starter inventory from plot types, cycling facings and marking corners. */
export function generateInventory(
  types: PlotType[],
  countPerType: number,
  blockPrefix = "A",
): InventoryPlot[] {
  const out: InventoryPlot[] = [];
  let n = 101;
  types.forEach((t) => {
    for (let i = 0; i < countPerType; i++) {
      const facing = (t.facingAllowed[i % Math.max(1, t.facingAllowed.length)] ?? "East") as Facing;
      const isCorner = i % 7 === 0;
      out.push({
        id: `${blockPrefix}-${n}`,
        number: `${blockPrefix}-${n}`,
        block: blockPrefix,
        typeId: t.id,
        areaSqYd: t.areaSqYd,
        lengthFt: t.lengthFt,
        widthFt: t.widthFt,
        facing,
        corner: isCorner ? "North-East" : "Not corner",
        roadWidthFt: i % 5 === 0 ? 40 : 30,
        features: i % 4 === 0 ? ["Park facing"] : [],
        category: t.category,
        status: "available",
      });
      n++;
    }
  });
  return out;
}
