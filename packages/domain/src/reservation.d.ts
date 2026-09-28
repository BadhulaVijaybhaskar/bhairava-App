export declare const DEFAULT_RESERVATION_HOURS = 48;
export declare const RESERVATION_STATES: readonly ["ACTIVE", "EXPIRING_TODAY", "EXPIRED", "CONVERTED", "RELEASED", "CANCEL_REQUESTED", "CANCELLED"];
export type ReservationState = (typeof RESERVATION_STATES)[number];
export declare function addHoursIso(from: string | Date, hours: number): string;
export declare function evaluateReservationState(r: {
    expiresAt: string | Date;
    state: string;
    cancelRequestStatus?: string | null;
}, now?: Date): ReservationState;
export declare function isActiveReservationState(state: string): boolean;
