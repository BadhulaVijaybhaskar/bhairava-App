"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plotHasValidPrice = plotHasValidPrice;
exports.evaluateReadiness = evaluateReadiness;
const plot_status_1 = require("./plot-status");
function hasLocation(input) {
    const cityStatePin = !!(input.city && input.state && input.pincode);
    const rural = !!(input.mandal && input.district && input.pincode);
    const coarse = !!(input.location && input.city);
    return cityStatePin || rural || coarse;
}
function plotHasValidPrice(p) {
    if (p.rateOverride != null && p.rateOverride > 0)
        return true;
    if (p.price != null && p.price > 0)
        return true;
    if (p.pricePerSqYd != null && p.pricePerSqYd > 0)
        return true;
    return false;
}
function dedupe(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        const key = `${item.id}:${item.severity}:${item.message}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}
function evaluateReadiness(input) {
    const blockers = [];
    const warnings = [];
    let scored = 0;
    let total = 0;
    const gate = (ok, id, message) => {
        total += 1;
        if (ok)
            scored += 1;
        else
            blockers.push({ id, severity: "error", message });
    };
    const warn = (ok, id, message) => {
        total += 1;
        if (ok)
            scored += 1;
        else
            warnings.push({ id, severity: "warning", message });
    };
    const inv = input.inventory ?? [];
    gate(!!(input.name && input.code && input.projectType), "A1", "Name, code, and project type are required.");
    gate(hasLocation(input), "A2", "Location requires city/state/pincode (or mandal/district + pincode).");
    gate(inv.length >= 1, "A3", "At least one plot inventory record is required.");
    gate(inv.length > 0 && inv.every(plotHasValidPrice), "A4", "Every plot must have a valid price (> 0) or resolvable rate.");
    warn(!!(input.layoutImage || input.hasMasterLayoutDocument), "W1", "No interactive layout / master layout yet.");
    warn((input.amenities?.length ?? 0) > 0, "W2", "No amenities configured.");
    warn((input.agents?.length ?? 0) > 0 || !!input.allAgentsPolicy, "W3", "No agents assigned.");
    if (input.reraMandatory) {
        gate(!!input.reraNumber, "W4", "RERA / statutory number is mandatory for this jurisdiction.");
    }
    else {
        warn(!!(input.reraNumber || (input.approvals?.length ?? 0) > 0), "W4", "RERA / statutory fields are empty.");
    }
    warn(!!(input.coverImage || input.brochure), "W5", "No hero / brochure media.");
    warn((input.pricingBaseRate ?? 0) > 0, "W6", "Pricing rules missing (plots may use only manual prices).");
    const activeIds = new Set(["A1", "A2", "A3", "A4", "W4"]);
    const activeBlockers = blockers.filter((b) => activeIds.has(b.id));
    const canActivate = activeBlockers.length === 0;
    const agentBlockers = [];
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
        const s = (0, plot_status_1.toCanonicalPlotStatus)(p.status);
        return s === "AVAILABLE" || s === "RESALE_AVAILABLE" || s === "RESERVED" || s === "BOOKED" || s === "SOLD" || s === "REGISTERED";
    });
    if (!(input.name && hasLocation(input) && inv.length > 0 && hasAgentPlot)) {
        agentBlockers.push({
            id: "G4",
            severity: "error",
            message: "Agent marketing basics require name, location, and at least one shown plot.",
        });
    }
    const customerBlockers = [];
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
    const publicSafe = inv.length === 0 ||
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
    }
    else if (!input.reraNumber && (input.approvals?.length ?? 0) === 0) {
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
//# sourceMappingURL=readiness.js.map