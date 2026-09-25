/**
 * Selectors that derive Overview metrics from inventory/bookings/payments.
 * Never invent permanent fake business numbers — return typed unavailable when underivable.
 */

import {
  countByCanonicalStatus,
  PLOT_STATUSES,
  PLOT_STATUS_LABEL,
  toCanonicalPlotStatus,
  type CanonicalPlotStatus,
} from "./plot-status";
import {
  evaluateReadiness,
  type ReadinessInput,
  type ReadinessResult,
} from "./readiness";
import {
  legacyProjectStatusToLifecycle,
  type ProjectLifecycle,
} from "./lifecycle";

export type MetricAvailability = "derived" | "unavailable";

export interface MetricValue<T> {
  availability: MetricAvailability;
  value: T | null;
  note?: string;
}

export interface InventoryFunnel {
  total: number;
  counts: Record<CanonicalPlotStatus, number>;
  labels: Record<CanonicalPlotStatus, string>;
}

export function projectLifecycleOf(project: {
  lifecycleStatus?: string;
  status?: string;
}): ProjectLifecycle {
  if (
    project.lifecycleStatus &&
    ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"].includes(project.lifecycleStatus)
  ) {
    return project.lifecycleStatus as ProjectLifecycle;
  }
  return legacyProjectStatusToLifecycle(project.status);
}

export function deriveInventoryFunnel(
  plots: { status?: unknown }[],
): InventoryFunnel {
  const counts = countByCanonicalStatus(plots.map((p) => ({ status: p.status })));
  const total = plots.length;
  return { total, counts, labels: { ...PLOT_STATUS_LABEL } };
}

export function derivePlotSizeMix(
  plots: { areaSqYd?: number }[],
): MetricValue<{ areaSqYd: number; count: number }[]> {
  if (!plots.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No plot inventory rows to derive size mix.",
    };
  }
  const map = new Map<number, number>();
  for (const p of plots) {
    const a = p.areaSqYd ?? 0;
    if (!a) continue;
    map.set(a, (map.get(a) ?? 0) + 1);
  }
  const value = [...map.entries()]
    .map(([areaSqYd, count]) => ({ areaSqYd, count }))
    .sort((a, b) => b.count - a.count);
  if (!value.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "Plot area fields missing — cannot derive size mix.",
    };
  }
  return { availability: "derived", value };
}

export function deriveFacingMix(
  plots: { facing?: string }[],
): MetricValue<{ facing: string; count: number }[]> {
  if (!plots.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No plot inventory rows to derive facing mix.",
    };
  }
  const map = new Map<string, number>();
  for (const p of plots) {
    const f = p.facing ?? "Unknown";
    map.set(f, (map.get(f) ?? 0) + 1);
  }
  return {
    availability: "derived",
    value: [...map.entries()].map(([facing, count]) => ({ facing, count })),
  };
}

export function deriveCornerPremiumCounts(plots: {
  corner?: string;
  features?: string[];
}[]): MetricValue<{ corner: number; parkFacing: number; mainRoad: number; premium: number }> {
  if (!plots.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No inventory for corner/premium counts.",
    };
  }
  let corner = 0;
  let parkFacing = 0;
  let mainRoad = 0;
  let premium = 0;
  for (const p of plots) {
    const c = (p.corner ?? "").toLowerCase();
    if (c && c !== "not corner" && c !== "none") corner += 1;
    const feats = p.features ?? [];
    if (feats.includes("Park facing")) parkFacing += 1;
    if (feats.includes("Main road facing")) mainRoad += 1;
    if (feats.includes("Premium location")) premium += 1;
  }
  return {
    availability: "derived",
    value: { corner, parkFacing, mainRoad, premium },
  };
}

/** Sales summary from real bookings only — never invent pipeline value. */
export function deriveSalesSummary(bookings: { amount?: number; stage?: string }[]): MetricValue<{
  bookingCount: number;
  bookedAmount: number;
}> {
  if (!bookings.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No project-scoped bookings in store — sales amount unavailable.",
    };
  }
  const active = bookings.filter((b) => b.stage !== "Cancelled");
  const bookedAmount = active.reduce((s, b) => s + (b.amount ?? 0), 0);
  return {
    availability: "derived",
    value: { bookingCount: active.length, bookedAmount },
  };
}

export function deriveCollectionsSummary(
  bookings: { amount?: number; paid?: number; stage?: string }[],
): MetricValue<{ collected: number; outstanding: number; bookingCount: number }> {
  if (!bookings.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No project-scoped bookings — collections/outstanding unavailable.",
    };
  }
  const active = bookings.filter((b) => b.stage !== "Cancelled");
  const collected = active.reduce((s, b) => s + (b.paid ?? 0), 0);
  const outstanding = active.reduce((s, b) => s + Math.max(0, (b.amount ?? 0) - (b.paid ?? 0)), 0);
  return {
    availability: "derived",
    value: { collected, outstanding, bookingCount: active.length },
  };
}

export function deriveRegistrationCount(
  plots: { status?: unknown }[],
): MetricValue<number> {
  if (!plots.length) {
    return {
      availability: "unavailable",
      value: null,
      note: "No inventory — registration count unavailable.",
    };
  }
  const n = plots.filter((p) => toCanonicalPlotStatus(p.status) === "REGISTERED").length;
  return { availability: "derived", value: n };
}

export function readinessInputFromProject(
  project: Record<string, unknown>,
  inventoryPlots: Array<Record<string, unknown>>,
): ReadinessInput {
  const inventory =
    (Array.isArray(project["inventory"]) && (project["inventory"] as unknown[]).length
      ? (project["inventory"] as Array<Record<string, unknown>>)
      : inventoryPlots
    ).map((p) => ({
      status: p["status"],
      pricePerSqYd: typeof p["pricePerSqYd"] === "number" ? p["pricePerSqYd"] : undefined,
      areaSqYd: typeof p["areaSqYd"] === "number" ? p["areaSqYd"] : undefined,
      number: typeof p["number"] === "string" ? p["number"] : undefined,
      rateOverride: typeof p["rateOverride"] === "number" ? p["rateOverride"] : undefined,
      price: typeof p["price"] === "number" ? p["price"] : undefined,
    }));

  const pricing = project["pricing"] as { baseRatePerSqYd?: number } | undefined;

  return {
    name: project["name"] as string | undefined,
    code: project["code"] as string | undefined,
    projectType: (project["projectType"] as string | undefined) ?? "Plotted development",
    city: project["city"] as string | undefined,
    state: project["state"] as string | undefined,
    pincode: project["pincode"] as string | undefined,
    village: project["village"] as string | undefined,
    mandal: project["mandal"] as string | undefined,
    district: project["district"] as string | undefined,
    location: project["location"] as string | undefined,
    description: project["description"] as string | undefined,
    coverImage: project["coverImage"] as string | undefined,
    brochure: project["brochure"] as string | undefined,
    layoutImage: project["layoutImage"] as string | undefined,
    reraNumber: project["reraNumber"] as string | undefined,
    reraMandatory: false,
    approvals: (project["approvals"] as string[] | undefined) ?? [],
    amenities: (project["amenities"] as unknown[] | undefined) ?? [],
    agents: (project["agents"] as string[] | undefined) ?? [],
    pricingBaseRate: pricing?.baseRatePerSqYd,
    inventory,
    lifecycleStatus: projectLifecycleOf({
      ...(typeof project["lifecycleStatus"] === "string"
        ? { lifecycleStatus: project["lifecycleStatus"] }
        : {}),
      ...(typeof project["status"] === "string" ? { status: project["status"] } : {}),
    }),
    agentVisible: !!project["agentVisible"],
    customerListed: !!project["customerListed"],
  };
}

export function evaluateProjectReadiness(
  project: Record<string, unknown>,
  inventoryPlots: Array<Record<string, unknown>>,
): ReadinessResult {
  return evaluateReadiness(readinessInputFromProject(project, inventoryPlots));
}

export { PLOT_STATUSES };
