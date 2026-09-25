"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLOT_STATUSES = void 0;
exports.projectLifecycleOf = projectLifecycleOf;
exports.deriveInventoryFunnel = deriveInventoryFunnel;
exports.derivePlotSizeMix = derivePlotSizeMix;
exports.deriveFacingMix = deriveFacingMix;
exports.deriveCornerPremiumCounts = deriveCornerPremiumCounts;
exports.deriveSalesSummary = deriveSalesSummary;
exports.deriveCollectionsSummary = deriveCollectionsSummary;
exports.deriveRegistrationCount = deriveRegistrationCount;
exports.readinessInputFromProject = readinessInputFromProject;
exports.evaluateProjectReadiness = evaluateProjectReadiness;
const plot_status_1 = require("./plot-status");
Object.defineProperty(exports, "PLOT_STATUSES", { enumerable: true, get: function () { return plot_status_1.PLOT_STATUSES; } });
const readiness_1 = require("./readiness");
const lifecycle_1 = require("./lifecycle");
function projectLifecycleOf(project) {
    if (project.lifecycleStatus &&
        ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"].includes(project.lifecycleStatus)) {
        return project.lifecycleStatus;
    }
    return (0, lifecycle_1.legacyProjectStatusToLifecycle)(project.status);
}
function deriveInventoryFunnel(plots) {
    const counts = (0, plot_status_1.countByCanonicalStatus)(plots.map((p) => ({ status: p.status })));
    const total = plots.length;
    return { total, counts, labels: { ...plot_status_1.PLOT_STATUS_LABEL } };
}
function derivePlotSizeMix(plots) {
    if (!plots.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No plot inventory rows to derive size mix.",
        };
    }
    const map = new Map();
    for (const p of plots) {
        const a = p.areaSqYd ?? 0;
        if (!a)
            continue;
        map.set(a, (map.get(a) ?? 0) + 1);
    }
    const value = [...map.entries()]
        .map(([areaSqYd, count]) => ({ areaSqYd, count }))
        .sort((a, b) => b.count - a.count);
    if (!value.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "Plot area fields missing — cannot derive size mix.",
        };
    }
    return { availability: "derived", value };
}
function deriveFacingMix(plots) {
    if (!plots.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No plot inventory rows to derive facing mix.",
        };
    }
    const map = new Map();
    for (const p of plots) {
        const f = p.facing ?? "Unknown";
        map.set(f, (map.get(f) ?? 0) + 1);
    }
    return {
        availability: "derived",
        value: [...map.entries()].map(([facing, count]) => ({ facing, count })),
    };
}
function deriveCornerPremiumCounts(plots) {
    if (!plots.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No inventory for corner/premium counts.",
        };
    }
    let corner = 0;
    let parkFacing = 0;
    let mainRoad = 0;
    let premium = 0;
    for (const p of plots) {
        const c = (p.corner ?? "").toLowerCase();
        if (c && c !== "not corner" && c !== "none")
            corner += 1;
        const feats = p.features ?? [];
        if (feats.includes("Park facing"))
            parkFacing += 1;
        if (feats.includes("Main road facing"))
            mainRoad += 1;
        if (feats.includes("Premium location"))
            premium += 1;
    }
    return {
        availability: "derived",
        value: { corner, parkFacing, mainRoad, premium },
    };
}
function deriveSalesSummary(bookings) {
    if (!bookings.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No project-scoped bookings in store — sales amount unavailable.",
        };
    }
    const active = bookings.filter((b) => b.stage !== "Cancelled");
    const bookedAmount = active.reduce((s, b) => s + (b.amount ?? 0), 0);
    return {
        availability: "derived",
        value: { bookingCount: active.length, bookedAmount },
    };
}
function deriveCollectionsSummary(bookings) {
    if (!bookings.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No project-scoped bookings — collections/outstanding unavailable.",
        };
    }
    const active = bookings.filter((b) => b.stage !== "Cancelled");
    const collected = active.reduce((s, b) => s + (b.paid ?? 0), 0);
    const outstanding = active.reduce((s, b) => s + Math.max(0, (b.amount ?? 0) - (b.paid ?? 0)), 0);
    return {
        availability: "derived",
        value: { collected, outstanding, bookingCount: active.length },
    };
}
function deriveRegistrationCount(plots) {
    if (!plots.length) {
        return {
            availability: "unavailable",
            value: null,
            note: "No inventory — registration count unavailable.",
        };
    }
    const n = plots.filter((p) => (0, plot_status_1.toCanonicalPlotStatus)(p.status) === "REGISTERED").length;
    return { availability: "derived", value: n };
}
function readinessInputFromProject(project, inventoryPlots) {
    const inventory = (Array.isArray(project["inventory"]) && project["inventory"].length
        ? project["inventory"]
        : inventoryPlots).map((p) => ({
        status: p["status"],
        pricePerSqYd: typeof p["pricePerSqYd"] === "number" ? p["pricePerSqYd"] : undefined,
        areaSqYd: typeof p["areaSqYd"] === "number" ? p["areaSqYd"] : undefined,
        number: typeof p["number"] === "string" ? p["number"] : undefined,
        rateOverride: typeof p["rateOverride"] === "number" ? p["rateOverride"] : undefined,
        price: typeof p["price"] === "number" ? p["price"] : undefined,
    }));
    const pricing = project["pricing"];
    return {
        name: project["name"],
        code: project["code"],
        projectType: project["projectType"] ?? "Plotted development",
        city: project["city"],
        state: project["state"],
        pincode: project["pincode"],
        village: project["village"],
        mandal: project["mandal"],
        district: project["district"],
        location: project["location"],
        description: project["description"],
        coverImage: project["coverImage"],
        brochure: project["brochure"],
        layoutImage: project["layoutImage"],
        reraNumber: project["reraNumber"],
        reraMandatory: false,
        approvals: project["approvals"] ?? [],
        amenities: project["amenities"] ?? [],
        agents: project["agents"] ?? [],
        pricingBaseRate: pricing?.baseRatePerSqYd,
        inventory,
        lifecycleStatus: projectLifecycleOf({
            ...(typeof project["lifecycleStatus"] === "string"
                ? { lifecycleStatus: project["lifecycleStatus"] }
                : {}),
            ...(typeof project["status"] === "string" ? { status: project["status"] } : {}),
        }),
        agentVisible: !!project["agentVisible"],
        customerListed: !!project["customerListed"],
    };
}
function evaluateProjectReadiness(project, inventoryPlots) {
    return (0, readiness_1.evaluateReadiness)(readinessInputFromProject(project, inventoryPlots));
}
//# sourceMappingURL=overview-metrics.js.map