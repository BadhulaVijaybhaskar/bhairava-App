export declare const PLOT_STATUSES: readonly ["AVAILABLE", "RESERVED", "BOOKED", "UNDER_DOCUMENTATION", "SOLD", "REGISTERED", "RESALE_AVAILABLE", "BLOCKED", "CANCELLED"];
export type CanonicalPlotStatus = (typeof PLOT_STATUSES)[number];
export type LegacyPlotStatus = "available" | "reserved" | "booked" | "registered" | "resale" | "sold" | "hold" | "blocked" | "cancelled" | "under_documentation" | "under documentation";
export declare function isCanonicalPlotStatus(value: unknown): value is CanonicalPlotStatus;
export declare function toCanonicalPlotStatus(raw: unknown): CanonicalPlotStatus;
export declare function toLegacyPlotStatus(status: CanonicalPlotStatus): LegacyPlotStatus;
export declare const PLOT_STATUS_LABEL: Record<CanonicalPlotStatus, string>;
export declare function countByCanonicalStatus(items: {
    status: unknown;
}[]): Record<CanonicalPlotStatus, number>;
