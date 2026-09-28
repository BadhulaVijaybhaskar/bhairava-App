"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CANONICAL_STATUSES = exports.ALLOWED_TRANSITIONS = void 0;
exports.allowedTargets = allowedTargets;
exports.isTransitionAllowed = isTransitionAllowed;
exports.applyStatusTransition = applyStatusTransition;
exports.validateBulkTransitions = validateBulkTransitions;
const plot_status_1 = require("./plot-status");
exports.ALLOWED_TRANSITIONS = {
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
function allowedTargets(from) {
    return [...exports.ALLOWED_TRANSITIONS[from]];
}
function isTransitionAllowed(from, to) {
    const f = (0, plot_status_1.toCanonicalPlotStatus)(from);
    const t = (0, plot_status_1.isCanonicalPlotStatus)(to) ? to : (0, plot_status_1.toCanonicalPlotStatus)(to);
    if (f === t)
        return false;
    return exports.ALLOWED_TRANSITIONS[f].includes(t);
}
function applyStatusTransition(req) {
    const from = (0, plot_status_1.toCanonicalPlotStatus)(req.from);
    const to = (0, plot_status_1.isCanonicalPlotStatus)(req.to) ? req.to : (0, plot_status_1.toCanonicalPlotStatus)(req.to);
    const source = req.source ?? "ADMIN_MANUAL";
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
    const entry = {
        fromStatus: from,
        toStatus: to,
        reason: (req.reason ?? "").trim() ||
            (source === "SYSTEM" ? "system" : source === "SALES_FLOW" ? "sales flow" : ""),
        actorId: req.actorId || "unknown",
        source,
        createdAt: new Date().toISOString(),
    };
    return { ok: true, from, to, entry };
}
function validateBulkTransitions(items, to, reason, actorId) {
    return items.map((item) => ({
        id: item.id,
        result: applyStatusTransition({ from: item.from, to, reason, actorId, source: "ADMIN_MANUAL" }),
    }));
}
exports.ALL_CANONICAL_STATUSES = plot_status_1.PLOT_STATUSES;
//# sourceMappingURL=plot-transitions.js.map