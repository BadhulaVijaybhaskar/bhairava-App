"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVATION_STATES = exports.DEFAULT_RESERVATION_HOURS = void 0;
exports.addHoursIso = addHoursIso;
exports.evaluateReservationState = evaluateReservationState;
exports.isActiveReservationState = isActiveReservationState;
exports.DEFAULT_RESERVATION_HOURS = 48;
exports.RESERVATION_STATES = [
    'ACTIVE',
    'EXPIRING_TODAY',
    'EXPIRED',
    'CONVERTED',
    'RELEASED',
    'CANCEL_REQUESTED',
    'CANCELLED',
];
function addHoursIso(from, hours) {
    const d = typeof from === 'string' ? new Date(from) : new Date(from.getTime());
    d.setTime(d.getTime() + hours * 60 * 60 * 1000);
    return d.toISOString();
}
function evaluateReservationState(r, now = new Date()) {
    const state = String(r.state).toUpperCase().replace(/\s+/g, '_');
    if (state === 'CONVERTED')
        return 'CONVERTED';
    if (state === 'RELEASED')
        return 'RELEASED';
    if (state === 'CANCELLED')
        return 'CANCELLED';
    if (r.cancelRequestStatus === 'APPROVED')
        return 'CANCELLED';
    if (r.cancelRequestStatus === 'PENDING')
        return 'CANCEL_REQUESTED';
    const exp = new Date(r.expiresAt);
    if (Number.isNaN(exp.getTime()))
        return 'ACTIVE';
    if (exp.getTime() <= now.getTime())
        return 'EXPIRED';
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    if (exp.getTime() <= endOfToday.getTime())
        return 'EXPIRING_TODAY';
    return 'ACTIVE';
}
function isActiveReservationState(state) {
    const s = state.toUpperCase().replace(/\s+/g, '_');
    return s === 'ACTIVE' || s === 'EXPIRING_TODAY' || s === 'CANCEL_REQUESTED';
}
//# sourceMappingURL=reservation.js.map