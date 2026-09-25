import type { ProjectLifecycle } from "./lifecycle";
export type ReadinessSeverity = "error" | "warning";
export interface ReadinessItem {
    id: string;
    severity: ReadinessSeverity;
    message: string;
}
export interface ReadinessPlotInput {
    status?: unknown;
    price?: number | undefined;
    pricePerSqYd?: number | undefined;
    areaSqYd?: number | undefined;
    number?: string | undefined;
    rateOverride?: number | undefined;
}
export interface ReadinessInput {
    name?: string | undefined;
    code?: string | undefined;
    projectType?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    pincode?: string | undefined;
    village?: string | undefined;
    mandal?: string | undefined;
    district?: string | undefined;
    location?: string | undefined;
    description?: string | undefined;
    coverImage?: string | undefined;
    brochure?: string | undefined;
    layoutImage?: string | undefined;
    hasMasterLayoutDocument?: boolean | undefined;
    reraNumber?: string | undefined;
    reraMandatory?: boolean | undefined;
    approvals?: string[] | undefined;
    amenities?: unknown[] | undefined;
    agents?: string[] | undefined;
    allAgentsPolicy?: boolean | undefined;
    pricingBaseRate?: number | undefined;
    inventory?: ReadinessPlotInput[] | undefined;
    lifecycleStatus: ProjectLifecycle;
    agentVisible?: boolean | undefined;
    customerListed?: boolean | undefined;
}
export interface ReadinessResult {
    blockers: ReadinessItem[];
    warnings: ReadinessItem[];
    percent: number;
    canActivate: boolean;
    canSetAgentVisible: boolean;
    canSetCustomerListed: boolean;
}
export declare function plotHasValidPrice(p: ReadinessPlotInput): boolean;
export declare function evaluateReadiness(input: ReadinessInput): ReadinessResult;
