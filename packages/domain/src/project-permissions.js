"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = normalizeRole;
exports.setupAccessForRole = setupAccessForRole;
exports.layoutAccessForRole = layoutAccessForRole;
exports.canEditSetup = canEditSetup;
exports.canViewSetup = canViewSetup;
exports.canChangeLifecycle = canChangeLifecycle;
exports.canChangePublishFlags = canChangePublishFlags;
exports.canPriceOverride = canPriceOverride;
exports.canOpenProjectWorkspace = canOpenProjectWorkspace;
exports.canViewLayout = canViewLayout;
exports.canEditPlotMaster = canEditPlotMaster;
exports.canCreatePlot = canCreatePlot;
exports.canChangePlotStatus = canChangePlotStatus;
exports.canBlockPlot = canBlockPlot;
exports.canOverridePlotPrice = canOverridePlotPrice;
exports.salesAccessForRole = salesAccessForRole;
exports.canEditSalesOps = canEditSalesOps;
exports.canViewSales = canViewSales;
function normalizeRole(raw) {
    if (typeof raw !== "string")
        return "Viewer";
    const s = raw.trim();
    switch (s) {
        case "Founder":
        case "Administrator":
        case "Finance":
        case "Viewer":
        case "Agent":
        case "Customer":
        case "Sales":
            return s;
        case "Admin":
            return "Administrator";
        default:
            return "Viewer";
    }
}
function setupAccessForRole(role) {
    const r = normalizeRole(role);
    if (r === "Founder" || r === "Administrator")
        return "full";
    if (r === "Finance" || r === "Viewer")
        return "read";
    return "denied";
}
function layoutAccessForRole(role) {
    const r = normalizeRole(role);
    if (r === "Founder" || r === "Administrator")
        return "full";
    if (r === "Finance" || r === "Viewer")
        return "read";
    if (r === "Agent" || r === "Sales")
        return "inventory";
    return "denied";
}
function canEditSetup(role) {
    return setupAccessForRole(role) === "full";
}
function canViewSetup(role) {
    const a = setupAccessForRole(role);
    return a === "full" || a === "read";
}
function canChangeLifecycle(role) {
    return canEditSetup(role);
}
function canChangePublishFlags(role) {
    return canEditSetup(role);
}
function canPriceOverride(role) {
    const r = normalizeRole(role);
    return r === "Founder" || r === "Administrator";
}
function canOpenProjectWorkspace(role) {
    const r = normalizeRole(role);
    return r === "Founder" || r === "Administrator" || r === "Finance" || r === "Viewer" || r === "Sales";
}
function canViewLayout(role) {
    const a = layoutAccessForRole(role);
    return a === "full" || a === "read" || a === "inventory";
}
function canEditPlotMaster(role) {
    return layoutAccessForRole(role) === "full";
}
function canCreatePlot(role) {
    return canEditPlotMaster(role);
}
function canChangePlotStatus(role) {
    return layoutAccessForRole(role) === "full";
}
function canBlockPlot(role) {
    return canChangePlotStatus(role);
}
function canOverridePlotPrice(role) {
    return canPriceOverride(role);
}
function salesAccessForRole(role) {
    const r = normalizeRole(role);
    if (r === "Founder" || r === "Administrator")
        return "full";
    if (r === "Finance" || r === "Viewer")
        return "read";
    if (r === "Agent" || r === "Sales")
        return "limited";
    return "denied";
}
function canEditSalesOps(role) {
    return salesAccessForRole(role) === "full";
}
function canViewSales(role) {
    const a = salesAccessForRole(role);
    return a === "full" || a === "read" || a === "limited";
}
//# sourceMappingURL=project-permissions.js.map