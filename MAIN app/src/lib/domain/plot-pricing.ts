/**
 * Plot price calculation from project pricing rules + optional hard override.
 * Hard override: Founder/Admin only, reason required, must not be silently cleared on attribute edits.
 */

import type { Facing, PricingRules } from "@/lib/mock-data";
import { defaultPricing } from "@/lib/project-config";
import type { CanonicalCorner } from "./plot-corner";
import { cornerIsPremium, toCanonicalCorner } from "./plot-corner";

export interface PriceInputs {
  areaSqYd: number;
  facing: Facing | string;
  corner?: CanonicalCorner | string | null;
  roadWidthFt?: number | null;
  features?: string[];
  rateOverride?: number | null;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface PriceResult {
  lines: PriceLine[];
  ratePerSqYd: number;
  total: number;
  isManualOverride: boolean;
}

function facingOf(raw: string): Facing {
  const f = raw.trim();
  if (f === "North" || f === "South" || f === "East" || f === "West") return f;
  return "East";
}

export function calculatePlotPrice(
  inputs: PriceInputs,
  rules?: PricingRules | null,
): PriceResult {
  const r = rules ?? defaultPricing();
  const area = Number.isFinite(inputs.areaSqYd) && inputs.areaSqYd > 0 ? inputs.areaSqYd : 0;

  if (inputs.rateOverride != null && Number.isFinite(inputs.rateOverride) && inputs.rateOverride > 0) {
    const rate = inputs.rateOverride;
    return {
      lines: [{ label: "Manual override", amount: rate }],
      ratePerSqYd: rate,
      total: rate * area,
      isManualOverride: true,
    };
  }

  const lines: PriceLine[] = [{ label: "Base rate", amount: r.baseRatePerSqYd }];
  const facing = facingOf(String(inputs.facing ?? "East"));
  const facingPrem = r.facingPremium[facing] ?? 0;
  if (facingPrem) lines.push({ label: `${facing} facing premium`, amount: facingPrem });

  const corner = toCanonicalCorner(inputs.corner);
  if (cornerIsPremium(corner) && r.cornerPremium) {
    const keyed = corner === "NONE" ? undefined : r.cornerPremiumByType?.[corner];
    const amt = keyed ?? r.cornerPremium;
    if (amt) lines.push({ label: `${corner} corner premium`, amount: amt });
  }

  for (const f of inputs.features ?? []) {
    const amt = r.featurePremium[f] ?? 0;
    if (amt) lines.push({ label: `${f} premium`, amount: amt });
  }

  if (inputs.roadWidthFt != null && r.roadWidthPremium) {
    const key = String(inputs.roadWidthFt);
    const amt = r.roadWidthPremium[key] ?? 0;
    if (amt) lines.push({ label: `${key} ft road premium`, amount: amt });
  }

  for (const other of r.otherPremiums ?? []) {
    if (other.amountPerSqYd) lines.push({ label: other.label, amount: other.amountPerSqYd });
  }

  const ratePerSqYd = lines.reduce((s, l) => s + l.amount, 0);
  return {
    lines,
    ratePerSqYd,
    total: ratePerSqYd * area,
    isManualOverride: false,
  };
}

export interface OverrideRequest {
  newRate: number;
  reason?: string;
  canOverride: boolean;
}

export type OverrideResult =
  | { ok: true; rate: number; reason: string }
  | { ok: false; error: string };

export function applyPriceOverride(req: OverrideRequest): OverrideResult {
  if (!req.canOverride) {
    return { ok: false, error: "Price override requires Founder or Administrator." };
  }
  if (!Number.isFinite(req.newRate) || req.newRate <= 0) {
    return { ok: false, error: "Override rate must be a positive number." };
  }
  const reason = (req.reason ?? "").trim();
  if (!reason) {
    return { ok: false, error: "Price override requires a non-empty reason." };
  }
  return { ok: true, rate: req.newRate, reason };
}

export function clearPriceOverride(
  canOverride: boolean,
): { ok: true; cleared: true } | { ok: false; error: string } {
  if (!canOverride) {
    return { ok: false, error: "Clearing a price override requires Founder or Administrator." };
  }
  return { ok: true, cleared: true };
}
