"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPricing = defaultPricing;
exports.calculatePlotPrice = calculatePlotPrice;
exports.applyPriceOverride = applyPriceOverride;
const plot_corner_1 = require("./plot-corner");
function defaultPricing() {
    return {
        baseRatePerSqYd: 0,
        facingPremium: { North: 0, South: 0, East: 0, West: 0 },
        cornerPremium: 0,
        featurePremium: {},
    };
}
function facingOf(raw) {
    const f = raw.trim();
    if (f === 'North' || f === 'South' || f === 'East' || f === 'West')
        return f;
    return 'East';
}
function calculatePlotPrice(inputs, rules) {
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
    const lines = [{ label: 'Base rate', amount: r.baseRatePerSqYd }];
    const facing = facingOf(String(inputs.facing ?? 'East'));
    const facingPrem = r.facingPremium[facing] ?? 0;
    if (facingPrem)
        lines.push({ label: facing + ' facing premium', amount: facingPrem });
    const corner = (0, plot_corner_1.toCanonicalCorner)(inputs.corner);
    if ((0, plot_corner_1.cornerIsPremium)(corner) && r.cornerPremium) {
        const keyed = corner === 'NONE' ? undefined : r.cornerPremiumByType?.[corner];
        const amt = keyed ?? r.cornerPremium;
        if (amt)
            lines.push({ label: corner + ' corner premium', amount: amt });
    }
    for (const f of inputs.features ?? []) {
        const amt = r.featurePremium[f] ?? 0;
        if (amt)
            lines.push({ label: f + ' premium', amount: amt });
    }
    if (inputs.roadWidthFt != null && r.roadWidthPremium) {
        const key = String(inputs.roadWidthFt);
        const amt = r.roadWidthPremium[key] ?? 0;
        if (amt)
            lines.push({ label: key + ' ft road premium', amount: amt });
    }
    for (const other of r.otherPremiums ?? []) {
        if (other.amountPerSqYd)
            lines.push({ label: other.label, amount: other.amountPerSqYd });
    }
    const ratePerSqYd = lines.reduce((s, l) => s + l.amount, 0);
    return { lines, ratePerSqYd, total: ratePerSqYd * area, isManualOverride: false };
}
function applyPriceOverride(req) {
    if (!req.canOverride)
        return { ok: false, error: 'Price override not permitted for this role.' };
    if (!Number.isFinite(req.newRate) || req.newRate <= 0)
        return { ok: false, error: 'Override rate must be a positive number.' };
    const reason = (req.reason ?? '').trim();
    if (!reason)
        return { ok: false, error: 'Override reason is required.' };
    return { ok: true, rate: req.newRate, reason };
}
//# sourceMappingURL=pricing.js.map