"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLOT_STATUS_LABEL = exports.PLOT_STATUSES = void 0;
exports.isCanonicalPlotStatus = isCanonicalPlotStatus;
exports.toCanonicalPlotStatus = toCanonicalPlotStatus;
exports.toLegacyPlotStatus = toLegacyPlotStatus;
exports.countByCanonicalStatus = countByCanonicalStatus;
exports.PLOT_STATUSES = [
    "AVAILABLE",
    "RESERVED",
    "BOOKED",
    "UNDER_DOCUMENTATION",
    "SOLD",
    "REGISTERED",
    "RESALE_AVAILABLE",
    "BLOCKED",
    "CANCELLED",
];
const LEGACY_MAP = {
    available: "AVAILABLE",
    reserved: "RESERVED",
    booked: "BOOKED",
    registered: "REGISTERED",
    resale: "RESALE_AVAILABLE",
    resale_available: "RESALE_AVAILABLE",
    "resale available": "RESALE_AVAILABLE",
    sold: "SOLD",
    hold: "BLOCKED",
    blocked: "BLOCKED",
    cancelled: "CANCELLED",
    canceled: "CANCELLED",
    under_documentation: "UNDER_DOCUMENTATION",
    "under documentation": "UNDER_DOCUMENTATION",
    underdocumentation: "UNDER_DOCUMENTATION",
};
const CANONICAL_TO_LEGACY = {
    AVAILABLE: "available",
    RESERVED: "reserved",
    BOOKED: "booked",
    UNDER_DOCUMENTATION: "booked",
    SOLD: "registered",
    REGISTERED: "registered",
    RESALE_AVAILABLE: "resale",
    BLOCKED: "available",
    CANCELLED: "available",
};
function isCanonicalPlotStatus(value) {
    return typeof value === "string" && exports.PLOT_STATUSES.includes(value);
}
function toCanonicalPlotStatus(raw) {
    if (isCanonicalPlotStatus(raw))
        return raw;
    if (typeof raw !== "string" || !raw.trim())
        return "AVAILABLE";
    const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const spaced = raw.trim().toLowerCase();
    return LEGACY_MAP[key] ?? LEGACY_MAP[spaced] ?? LEGACY_MAP[raw.trim().toLowerCase()] ?? "AVAILABLE";
}
function toLegacyPlotStatus(status) {
    return CANONICAL_TO_LEGACY[status];
}
exports.PLOT_STATUS_LABEL = {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    BOOKED: "Booked",
    UNDER_DOCUMENTATION: "Under documentation",
    SOLD: "Sold",
    REGISTERED: "Registered",
    RESALE_AVAILABLE: "Resale available",
    BLOCKED: "Blocked",
    CANCELLED: "Cancelled",
};
function countByCanonicalStatus(items) {
    const counts = Object.fromEntries(exports.PLOT_STATUSES.map((s) => [s, 0]));
    for (const item of items) {
        const s = toCanonicalPlotStatus(item.status);
        counts[s] += 1;
    }
    return counts;
}
//# sourceMappingURL=plot-status.js.map