export declare const DOCUMENT_VISIBILITIES: readonly ["INTERNAL", "AGENT_VISIBLE", "CUSTOMER_PROFILE_RELATED"];
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];
export declare function isDocumentVisibility(v: unknown): v is DocumentVisibility;
