import { type CanonicalPlotStatus } from "./plot-status";
export type StatusChangeSource = "SALES_FLOW" | "ADMIN_MANUAL" | "SYSTEM";
export interface PlotStatusHistoryEntry {
    fromStatus: CanonicalPlotStatus;
    toStatus: CanonicalPlotStatus;
    reason: string;
    actorId: string;
    source: StatusChangeSource;
    createdAt: string;
}
export declare const ALLOWED_TRANSITIONS: Record<CanonicalPlotStatus, readonly CanonicalPlotStatus[]>;
export declare function allowedTargets(from: CanonicalPlotStatus): CanonicalPlotStatus[];
export declare function isTransitionAllowed(from: CanonicalPlotStatus | unknown, to: CanonicalPlotStatus | unknown): boolean;
export interface TransitionRequest {
    from: unknown;
    to: unknown;
    reason?: string;
    actorId: string;
    source?: StatusChangeSource;
}
export type TransitionResult = {
    ok: true;
    from: CanonicalPlotStatus;
    to: CanonicalPlotStatus;
    entry: PlotStatusHistoryEntry;
} | {
    ok: false;
    error: string;
};
export declare function applyStatusTransition(req: TransitionRequest): TransitionResult;
export declare function validateBulkTransitions(items: {
    id: string;
    from: unknown;
}[], to: CanonicalPlotStatus, reason: string, actorId: string): {
    id: string;
    result: TransitionResult;
}[];
export declare const ALL_CANONICAL_STATUSES: readonly ["AVAILABLE", "RESERVED", "BOOKED", "UNDER_DOCUMENTATION", "SOLD", "REGISTERED", "RESALE_AVAILABLE", "BLOCKED", "CANCELLED"];
