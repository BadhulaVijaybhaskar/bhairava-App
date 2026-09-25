import { type CanonicalCorner } from './plot-corner';
export type Facing = 'North' | 'South' | 'East' | 'West';
export interface PricingRules {
    baseRatePerSqYd: number;
    facingPremium: Partial<Record<Facing, number>>;
    cornerPremium: number;
    cornerPremiumByType?: Partial<Record<'NE' | 'NW' | 'SE' | 'SW', number>>;
    featurePremium: Record<string, number>;
    roadWidthPremium?: Record<string, number>;
    otherPremiums?: {
        label: string;
        amountPerSqYd: number;
    }[];
}
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
export declare function defaultPricing(): PricingRules;
export declare function calculatePlotPrice(inputs: PriceInputs, rules?: PricingRules | null): PriceResult;
export declare function applyPriceOverride(req: {
    newRate: number;
    reason?: string;
    canOverride: boolean;
}): {
    ok: true;
    rate: number;
    reason: string;
} | {
    ok: false;
    error: string;
};
