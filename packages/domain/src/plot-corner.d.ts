export declare const CORNER_CODES: readonly ["NONE", "NE", "NW", "SE", "SW"];
export type CanonicalCorner = (typeof CORNER_CODES)[number];
export declare const CORNER_LABEL: Record<CanonicalCorner, string>;
export declare function toCanonicalCorner(raw: unknown): CanonicalCorner;
export declare function cornerIsPremium(raw: unknown): boolean;
export declare function toLegacyCornerLabel(code: CanonicalCorner): string;
