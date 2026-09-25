/**
 * Plot status transition allow-list (Portfolio OS §13 / plot-status-domain).
 * Exceptional / free-form changes use source ADMIN_MANUAL and require a non-empty reason.
 */

import {
  PLOT_STATUSES,
  type CanonicalPlotStatus,
  isCanonicalPlotStatus,
  toCanonicalPlotStatus,
} from "./plot-status";

export type StatusChangeSource = "SALES_FLOW" | "ADMIN_MANUAL" | "SYSTEM";

export interface PlotStatusHistoryEntry {
  fromStatus: CanonicalPlotStatus;
  toStatus: CanonicalPlotStatus;
  reason: string;
  actorId: string;
  source: StatusChangeSource;
  createdAt: string;
}

/** Happy-path + documented side transitions. Keys = from; values = allowed to. */
export const ALLOWED_TRANSITIONS: Record<CanonicalPlotStatus, readonly CanonicalPlotStatus[]> = {
  AVAILABLE: ["RESERVED", "BLOCKED"],
  RESERVED: ["AVAILABLE", "CANCELLED", "BOOKED"],
  BOOKED: ["UNDER_DOCUMENTATION", "CANCELLED"],
  UNDER_DOCUMENTATION: ["BOOKED", "SOLD", "CANCELLED"],
  SOLD: ["REGISTERED", "RESALE_AVAILABLE"],
  REGISTERED: ["RESALE_AVAILABLE"],
  RESALE_AVAILABLE: ["RESERVED", "BLOCKED"],
  BLOCKED: ["AVAILABLE"],
  CANCELLED: ["AVAILABLE"],
};

export function allowedTargets(from: CanonicalPlotStatus): CanonicalPlotStatus[] {
  return [...ALLOWED_TRANSITIONS[from]];
}

export function isTransitionAllowed(
  from: CanonicalPlotStatus | unknown,
  to: CanonicalPlotStatus | unknown,
): boolean {
  const f = toCanonicalPlotStatus(from);
  const t = isCanonicalPlotStatus(to) ? to : toCanonicalPlotStatus(to);
  if (f === t) return false;
  return ALLOWED_TRANSITIONS[f].includes(t);
}

export interface TransitionRequest {
  from: unknown;
  to: unknown;
  reason?: string;
  actorId: string;
  source?: StatusChangeSource;
}

export type TransitionResult =
  | { ok: true; from: CanonicalPlotStatus; to: CanonicalPlotStatus; entry: PlotStatusHistoryEntry }
  | { ok: false; error: string };

/**
 * Validate + build a history entry. Does not mutate store.
 * ADMIN_MANUAL (default for UI status changes) always requires non-empty reason.
 */
export function applyStatusTransition(req: TransitionRequest): TransitionResult {
  const from = toCanonicalPlotStatus(req.from);
  const to = isCanonicalPlotStatus(req.to) ? req.to : toCanonicalPlotStatus(req.to);
  const source: StatusChangeSource = req.source ?? "ADMIN_MANUAL";

  if (from === to) {
    return { ok: false, error: "Status is unchanged." };
  }
  if (!isTransitionAllowed(from, to)) {
    return {
      ok: false,
      error: `Transition ${from} → ${to} is not allowed.`,
    };
  }
  if (source === "ADMIN_MANUAL") {
    const reason = (req.reason ?? "").trim();
    if (!reason) {
      return { ok: false, error: "ADMIN_MANUAL status changes require a non-empty reason." };
    }
  }

  const entry: PlotStatusHistoryEntry = {
    fromStatus: from,
    toStatus: to,
    reason:
      (req.reason ?? "").trim() ||
      (source === "SYSTEM" ? "system" : source === "SALES_FLOW" ? "sales flow" : ""),
    actorId: req.actorId || "unknown",
    source,
    createdAt: new Date().toISOString(),
  };

  return { ok: true, from, to, entry };
}

/** Bulk helper — returns per-id results; does not short-circuit. */
export function validateBulkTransitions(
  items: { id: string; from: unknown }[],
  to: CanonicalPlotStatus,
  reason: string,
  actorId: string,
): { id: string; result: TransitionResult }[] {
  return items.map((item) => ({
    id: item.id,
    result: applyStatusTransition({ from: item.from, to, reason, actorId, source: "ADMIN_MANUAL" }),
  }));
}

export const ALL_CANONICAL_STATUSES = PLOT_STATUSES;
