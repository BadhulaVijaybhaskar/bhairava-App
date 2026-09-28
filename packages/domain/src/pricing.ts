/**
 * Plot price calculation — pure domain (no UI deps).
 */
import { cornerIsPremium, toCanonicalCorner, type CanonicalCorner } from './plot-corner';

export type Facing = 'North' | 'South' | 'East' | 'West';

export interface PricingRules {
  baseRatePerSqYd: number;
  facingPremium: Partial<Record<Facing, number>>;
  cornerPremium: number;
  cornerPremiumByType?: Partial<Record<'NE' | 'NW' | 'SE' | 'SW', number>>;
  featurePremium: Record<string, number>;
  roadWidthPremium?: Record<string, number>;
  otherPremiums?: { label: string; amountPerSqYd: number }[];
}

export interface PriceInputs {
  areaSqYd: number;
  facing: Facing | string;
  corner?: CanonicalCorner | string | null;
  roadWidthFt?: number | null;
  features?: string[];
  rateOverride?: number | null;
}

export interface PriceLine { label: string; amount: number; }
export interface PriceResult {
  lines: PriceLine[];
  ratePerSqYd: number;
  total: number;
  isManualOverride: boolean;
}

export function defaultPricing(): PricingRules {
  return {
    baseRatePerSqYd: 0,
    facingPremium: { North: 0, South: 0, East: 0, West: 0 },
    cornerPremium: 0,
    featurePremium: {},
  };
}

function facingOf(raw: string): Facing {
  const f = raw.trim();
  if (f === 'North' || f === 'South' || f === 'East' || f === 'West') return f;
  return 'East';
}

export function calculatePlotPrice(inputs: PriceInputs, rules?: PricingRules | null): PriceResult {
  const r = rules ?? defaultPricing();
  const area = Number.isFinite(inputs.areaSqYd) && inputs.areaSqYd > 0 ? inputs.areaSqYd : 0;

  if (inputs.rateOverride != null && Number.isFinite(inputs.rateOverride) && inputs.rateOverride > 0) {
    const rate = inputs.rateOverride;
    return {
      lines: [{ label: 'Manual override', amount: rate }],
      ratePerSqYd: rate,
      total: rate * area,
      isManualOverride: true,
    };
  }

  const lines: PriceLine[] = [{ label: 'Base rate', amount: r.baseRatePerSqYd }];
  const facing = facingOf(String(inputs.facing ?? 'East'));
  const facingPrem = r.facingPremium[facing] ?? 0;
  if (facingPrem) lines.push({ label: facing + ' facing premium', amount: facingPrem });

  const corner = toCanonicalCorner(inputs.corner);
  if (cornerIsPremium(corner) && r.cornerPremium) {
    const keyed = corner === 'NONE' ? undefined : r.cornerPremiumByType?.[corner];
    const amt = keyed ?? r.cornerPremium;
    if (amt) lines.push({ label: corner + ' corner premium', amount: amt });
  }

  for (const f of inputs.features ?? []) {
    const amt = r.featurePremium[f] ?? 0;
    if (amt) lines.push({ label: f + ' premium', amount: amt });
  }

  if (inputs.roadWidthFt != null && r.roadWidthPremium) {
    const key = String(inputs.roadWidthFt);
    const amt = r.roadWidthPremium[key] ?? 0;
    if (amt) lines.push({ label: key + ' ft road premium', amount: amt });
  }

  for (const other of r.otherPremiums ?? []) {
    if (other.amountPerSqYd) lines.push({ label: other.label, amount: other.amountPerSqYd });
  }

  const ratePerSqYd = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, ratePerSqYd, total: ratePerSqYd * area, isManualOverride: false };
}

export function applyPriceOverride(req: {
  newRate: number; reason?: string; canOverride: boolean;
}): { ok: true; rate: number; reason: string } | { ok: false; error: string } {
  if (!req.canOverride) return { ok: false, error: 'Price override not permitted for this role.' };
  if (!Number.isFinite(req.newRate) || req.newRate <= 0) return { ok: false, error: 'Override rate must be a positive number.' };
  const reason = (req.reason ?? '').trim();
  if (!reason) return { ok: false, error: 'Override reason is required.' };
  return { ok: true, rate: req.newRate, reason };
}
