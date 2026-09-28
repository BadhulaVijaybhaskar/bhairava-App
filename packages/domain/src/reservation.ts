/** Reservation concurrency + expiry domain helpers. */
export const DEFAULT_RESERVATION_HOURS = 48;

export const RESERVATION_STATES = [
  'ACTIVE',
  'EXPIRING_TODAY',
  'EXPIRED',
  'CONVERTED',
  'RELEASED',
  'CANCEL_REQUESTED',
  'CANCELLED',
] as const;
export type ReservationState = (typeof RESERVATION_STATES)[number];

export function addHoursIso(from: string | Date, hours: number): string {
  const d = typeof from === 'string' ? new Date(from) : new Date(from.getTime());
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

export function evaluateReservationState(
  r: { expiresAt: string | Date; state: string; cancelRequestStatus?: string | null },
  now: Date = new Date(),
): ReservationState {
  const state = String(r.state).toUpperCase().replace(/\s+/g, '_');
  if (state === 'CONVERTED') return 'CONVERTED';
  if (state === 'RELEASED') return 'RELEASED';
  if (state === 'CANCELLED') return 'CANCELLED';
  if (r.cancelRequestStatus === 'APPROVED') return 'CANCELLED';
  if (r.cancelRequestStatus === 'PENDING') return 'CANCEL_REQUESTED';
  const exp = new Date(r.expiresAt);
  if (Number.isNaN(exp.getTime())) return 'ACTIVE';
  if (exp.getTime() <= now.getTime()) return 'EXPIRED';
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (exp.getTime() <= endOfToday.getTime()) return 'EXPIRING_TODAY';
  return 'ACTIVE';
}

export function isActiveReservationState(state: string): boolean {
  const s = state.toUpperCase().replace(/\s+/g, '_');
  return s === 'ACTIVE' || s === 'EXPIRING_TODAY' || s === 'CANCEL_REQUESTED';
}
