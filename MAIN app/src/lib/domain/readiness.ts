/**
 * Draft→Active / publish readiness evaluator (Portfolio OS §12).
 * No hard-coded mandatory RERA — optional unless jurisdiction profile says otherwise.
 */

import type { ProjectLifecycle } from "./lifecycle";
import { toCanonicalPlotStatus } from "./plot-status";

export type ReadinessSeverity = "error" | "warning";

export interface ReadinessItem {
  id: string;
  severity: ReadinessSeverity;
  message: string;
}

export interface ReadinessPlotInput {
  status?: unknown;
  price?: number | undefined;
  pricePerSqYd?: number | undefined;
  areaSqYd?: number | undefined;
  number?: string | undefined;
  rateOverride?: number | undefined;
}

export interface ReadinessInput {
  name?: string | undefined;
  code?: string | undefined;
  projectType?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  pincode?: string | undefined;
  village?: string | undefined;
  mandal?: string | undefined;
  district?: string | undefined;
  location?: string | undefined;
  description?: string | undefined;
  coverImage?: string | undefined;
  brochure?: string | undefined;
  layoutImage?: string | undefined;
  hasMasterLayoutDocument?: boolean | undefined;
  reraNumber?: string | undefined;
  /** When true, empty RERA becomes an error (jurisdiction profile). Default false. */
  reraMandatory?: boolean | undefined;
  approvals?: string[] | undefined;
  amenities?: unknown[] | undefined;
  agents?: string[] | undefined;
  allAgentsPolicy?: boolean | undefined;
  pricingBaseRate?: number | undefined;
  inventory?: ReadinessPlotInput[] | undefined;
  lifecycleStatus: ProjectLifecycle;
  agentVisible?: boolean | undefined;
  customerListed?: boolean | undefined;
}

export interface ReadinessResult {
  blockers: ReadinessItem[];
  warnings: ReadinessItem[];
  /** 0–100 informational completeness across Active checklist + warnings. */
  percent: number;
  canActivate: boolean;
  canSetAgentVisible: boolean;
  canSetCustomerListed: boolean;
}

function hasLocation(input: ReadinessInput): boolean {
  const cityStatePin = !!(input.city && input.state && input.pincode);
  const rural = !!(input.mandal && input.district && input.pincode);
  const coarse = !!(input.location && input.city);
  return cityStatePin || rural || coarse;
}

export function plotHasValidPrice(p: ReadinessPlotInput): boolean {
  if (p.rateOverride != null && p.rateOverride > 0) return true;
  if (p.price != null && p.price > 0) return true;
  if (p.pricePerSqYd != null && p.pricePerSqYd > 0) return true;
  return false;
}

function dedupe(items: ReadinessItem[]): ReadinessItem[] {
  const seen = new Set<string>();
  const out: ReadinessItem[] = [];
  for (const item of items) {
    const key = `${item.id}:${item.severity}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  const blockers: ReadinessItem[] = [];
  const warnings: ReadinessItem[] = [];
  let scored = 0;
  let total = 0;

  const gate = (ok: boolean, id: string, message: string) => {
    total += 1;
    if (ok) scored += 1;
    else blockers.push({ id, severity: "error", message });
  };
  const warn = (ok: boolean, id: string, message: string) => {
    total += 1;
    if (ok) scored += 1;
    else warnings.push({ id, severity: "warning", message });
  };

  const inv = input.inventory ?? [];

  // §12.1 Active blockers
  gate(!!(input.name && input.code && input.projectType), "A1", "Name, code, and project type are required.");
  gate(hasLocation(input), "A2", "Location requires city/state/pincode (or mandal/district + pincode).");
  gate(inv.length >= 1, "A3", "At least one plot inventory record is required.");
  gate(inv.length > 0 && inv.every(plotHasValidPrice), "A4", "Every plot must have a valid price (> 0) or resolvable rate.");

  // §12.2 Warnings (W4 escalates when reraMandatory)
  warn(!!(input.layoutImage || input.hasMasterLayoutDocument), "W1", "No interactive layout / master layout yet.");
  warn((input.amenities?.length ?? 0) > 0, "W2", "No amenities configured.");
  warn((input.agents?.length ?? 0) > 0 || !!input.allAgentsPolicy, "W3", "No agents assigned.");
  if (input.reraMandatory) {
    gate(!!input.reraNumber, "W4", "RERA / statutory number is mandatory for this jurisdiction.");
  } else {
    warn(!!(input.reraNumber || (input.approvals?.length ?? 0) > 0), "W4", "RERA / statutory fields are empty.");
  }
  warn(!!(input.coverImage || input.brochure), "W5", "No hero / brochure media.");
  warn((input.pricingBaseRate ?? 0) > 0, "W6", "Pricing rules missing (plots may use only manual prices).");

  const activeIds = new Set(["A1", "A2", "A3", "A4", "W4"]);
  const activeBlockers = blockers.filter((b) => activeIds.has(b.id));
  const canActivate = activeBlockers.length === 0;

  // §12.3 agentVisible
  const agentBlockers: ReadinessItem[] = [];
  if (input.lifecycleStatus !== "ACTIVE") {
    agentBlockers.push({ id: "G1", severity: "error", message: "Lifecycle must be ACTIVE before agent visibility." });
  }
  if (!canActivate) {
    agentBlockers.push({ id: "G2", severity: "error", message: "Active checklist (A1–A4) must pass before agent visibility." });
  }
  if ((input.agents?.length ?? 0) < 1 && !input.allAgentsPolicy) {
    agentBlockers.push({ id: "G3", severity: "error", message: "Assign at least one agent (or enable all-agents policy)." });
  }
  const hasAgentPlot = inv.some((p) => {
    const s = toCanonicalPlotStatus(p.status);
    return s === "AVAILABLE" || s === "RESALE_AVAILABLE" || s === "RESERVED" || s === "BOOKED" || s === "SOLD" || s === "REGISTERED";
  });
  if (!(input.name && hasLocation(input) && inv.length > 0 && hasAgentPlot)) {
    agentBlockers.push({
      id: "G4",
      severity: "error",
      message: "Agent marketing basics require name, location, and at least one shown plot.",
    });
  }

  // §12.4 customerListed
  const customerBlockers: ReadinessItem[] = [];
  if (input.lifecycleStatus !== "ACTIVE") {
    customerBlockers.push({ id: "C1", severity: "error", message: "Lifecycle must be ACTIVE before customer listing." });
  }
  if (!canActivate) {
    customerBlockers.push({ id: "C2", severity: "error", message: "Active checklist (A1–A4) must pass before customer listing." });
  }
  if (!(input.name && hasLocation(input) && !!(input.description || input.coverImage || input.brochure))) {
    customerBlockers.push({
      id: "C3",
      severity: "error",
      message: "Customer listing needs name, location, and public description or media.",
    });
  }
  if (!(input.layoutImage || input.hasMasterLayoutDocument)) {
    customerBlockers.push({
      id: "C4",
      severity: "error",
      message: "Customer listing requires interactive layout or a master-layout document.",
    });
  }
  const publicSafe =
    inv.length === 0 ||
    inv.every((p) => !!(p.number && (p.areaSqYd ?? 0) > 0 && plotHasValidPrice(p)));
  if (inv.length > 0 && !publicSafe) {
    customerBlockers.push({
      id: "C5",
      severity: "error",
      message: "Every plot needs public-safe fields (number, area, availability, price).",
    });
  }
  if (input.reraMandatory && !input.reraNumber) {
    customerBlockers.push({
      id: "C6",
      severity: "error",
      message: "RERA is mandatory before customer listing in this jurisdiction.",
    });
  } else if (!input.reraNumber && (input.approvals?.length ?? 0) === 0) {
    warnings.push({ id: "C6", severity: "warning", message: "RERA / legal fields empty for customer listing." });
  }

  return {
    blockers: dedupe([...activeBlockers, ...agentBlockers, ...customerBlockers]),
    warnings: dedupe(warnings),
    percent: total === 0 ? 0 : Math.round((scored / total) * 100),
    canActivate,
    canSetAgentVisible: agentBlockers.length === 0,
    canSetCustomerListed: customerBlockers.length === 0,
  };
}
