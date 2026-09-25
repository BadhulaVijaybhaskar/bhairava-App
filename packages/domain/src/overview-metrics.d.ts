import { PLOT_STATUSES, type CanonicalPlotStatus } from "./plot-status";
import { type ReadinessInput, type ReadinessResult } from "./readiness";
import { type ProjectLifecycle } from "./lifecycle";
export type MetricAvailability = "derived" | "unavailable";
export interface MetricValue<T> {
    availability: MetricAvailability;
    value: T | null;
    note?: string;
}
export interface InventoryFunnel {
    total: number;
    counts: Record<CanonicalPlotStatus, number>;
    labels: Record<CanonicalPlotStatus, string>;
}
export declare function projectLifecycleOf(project: {
    lifecycleStatus?: string;
    status?: string;
}): ProjectLifecycle;
export declare function deriveInventoryFunnel(plots: {
    status?: unknown;
}[]): InventoryFunnel;
export declare function derivePlotSizeMix(plots: {
    areaSqYd?: number;
}[]): MetricValue<{
    areaSqYd: number;
    count: number;
}[]>;
export declare function deriveFacingMix(plots: {
    facing?: string;
}[]): MetricValue<{
    facing: string;
    count: number;
}[]>;
export declare function deriveCornerPremiumCounts(plots: {
    corner?: string;
    features?: string[];
}[]): MetricValue<{
    corner: number;
    parkFacing: number;
    mainRoad: number;
    premium: number;
}>;
export declare function deriveSalesSummary(bookings: {
    amount?: number;
    stage?: string;
}[]): MetricValue<{
    bookingCount: number;
    bookedAmount: number;
}>;
export declare function deriveCollectionsSummary(bookings: {
    amount?: number;
    paid?: number;
    stage?: string;
}[]): MetricValue<{
    collected: number;
    outstanding: number;
    bookingCount: number;
}>;
export declare function deriveRegistrationCount(plots: {
    status?: unknown;
}[]): MetricValue<number>;
export declare function readinessInputFromProject(project: Record<string, unknown>, inventoryPlots: Array<Record<string, unknown>>): ReadinessInput;
export declare function evaluateProjectReadiness(project: Record<string, unknown>, inventoryPlots: Array<Record<string, unknown>>): ReadinessResult;
export { PLOT_STATUSES };
