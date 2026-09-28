export declare const LIFECYCLE_STATUSES: readonly ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
export type ProjectLifecycle = (typeof LIFECYCLE_STATUSES)[number];
export type LegacyProjectStatus = "Draft" | "Pre-launch" | "Active" | "Sold out" | "On hold" | "Inactive";
export declare function legacyProjectStatusToLifecycle(raw: unknown): ProjectLifecycle;
export declare function lifecycleToLegacyStatusLabel(lifecycle: ProjectLifecycle): LegacyProjectStatus;
export declare const LIFECYCLE_LABEL: Record<ProjectLifecycle, string>;
export interface ProjectVisibility {
    agentVisible: boolean;
    customerListed: boolean;
}
export declare function enforceVisibilityForLifecycle(lifecycle: ProjectLifecycle, flags: ProjectVisibility): ProjectVisibility;
