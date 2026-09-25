"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORNER_LABEL = exports.CORNER_CODES = void 0;
exports.toCanonicalCorner = toCanonicalCorner;
exports.cornerIsPremium = cornerIsPremium;
exports.toLegacyCornerLabel = toLegacyCornerLabel;
exports.CORNER_CODES = ["NONE", "NE", "NW", "SE", "SW"];
exports.CORNER_LABEL = {
    NONE: "None",
    NE: "North-East",
    NW: "North-West",
    SE: "South-East",
    SW: "South-West",
};
const LEGACY_CORNER = {
    none: "NONE",
    "not corner": "NONE",
    "not_corner": "NONE",
    ne: "NE",
    "north-east": "NE",
    "north_east": "NE",
    "north east": "NE",
    nw: "NW",
    "north-west": "NW",
    "north_west": "NW",
    "north west": "NW",
    se: "SE",
    "south-east": "SE",
    "south_east": "SE",
    "south east": "SE",
    sw: "SW",
    "south-west": "SW",
    "south_west": "SW",
    "south west": "SW",
};
function toCanonicalCorner(raw) {
    if (typeof raw === "string" && exports.CORNER_CODES.includes(raw)) {
        return raw;
    }
    if (typeof raw !== "string" || !raw.trim())
        return "NONE";
    const key = raw.trim().toLowerCase();
    return LEGACY_CORNER[key] ?? LEGACY_CORNER[key.replace(/[\s_]+/g, "-")] ?? "NONE";
}
function cornerIsPremium(raw) {
    return toCanonicalCorner(raw) !== "NONE";
}
function toLegacyCornerLabel(code) {
    switch (code) {
        case "NE":
            return "North-East";
        case "NW":
            return "North-West";
        case "SE":
            return "South-East";
        case "SW":
            return "South-West";
        default:
            return "Not corner";
    }
}
//# sourceMappingURL=plot-corner.js.map