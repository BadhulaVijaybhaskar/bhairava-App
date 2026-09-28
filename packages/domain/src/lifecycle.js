"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LIFECYCLE_LABEL = exports.LIFECYCLE_STATUSES = void 0;
exports.legacyProjectStatusToLifecycle = legacyProjectStatusToLifecycle;
exports.lifecycleToLegacyStatusLabel = lifecycleToLegacyStatusLabel;
exports.enforceVisibilityForLifecycle = enforceVisibilityForLifecycle;
exports.LIFECYCLE_STATUSES = [
    "DRAFT",
    "ACTIVE",
    "ON_HOLD",
    "COMPLETED",
    "ARCHIVED",
];
function legacyProjectStatusToLifecycle(raw) {
    if (typeof raw === "string" && exports.LIFECYCLE_STATUSES.includes(raw)) {
        return raw;
    }
    const s = typeof raw === "string" ? raw.trim() : "";
    switch (s) {
        case "Draft":
        case "DRAFT":
            return "DRAFT";
        case "Pre-launch":
            return "DRAFT";
        case "Active":
        case "ACTIVE":
            return "ACTIVE";
        case "On hold":
        case "ON_HOLD":
            return "ON_HOLD";
        case "Sold out":
        case "COMPLETED":
            return "COMPLETED";
        case "Inactive":
        case "ARCHIVED":
            return "ARCHIVED";
        default:
            return "DRAFT";
    }
}
function lifecycleToLegacyStatusLabel(lifecycle) {
    switch (lifecycle) {
        case "DRAFT":
            return "Draft";
        case "ACTIVE":
            return "Active";
        case "ON_HOLD":
            return "On hold";
        case "COMPLETED":
            return "Sold out";
        case "ARCHIVED":
            return "Inactive";
    }
}
exports.LIFECYCLE_LABEL = {
    DRAFT: "Draft",
    ACTIVE: "Active",
    ON_HOLD: "On hold",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
};
function enforceVisibilityForLifecycle(lifecycle, flags) {
    if (lifecycle === "DRAFT") {
        return { agentVisible: false, customerListed: false };
    }
    if (lifecycle === "COMPLETED" || lifecycle === "ARCHIVED") {
        return {
            agentVisible: flags.agentVisible,
            customerListed: false,
        };
    }
    return {
        agentVisible: !!flags.agentVisible,
        customerListed: !!flags.customerListed,
    };
}
//# sourceMappingURL=lifecycle.js.map