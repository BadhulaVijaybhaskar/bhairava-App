/**
 * Pure MPIN validation and lockout helpers (Customer + Agent quick login).
 * Never log or return the MPIN value itself.
 */

export const MPIN_LENGTH = 4;
export const MPIN_MAX_FAILED_ATTEMPTS = 5;
/** Temporary lock duration after max failed attempts. */
export const MPIN_LOCK_MS = 15 * 60 * 1000;

export type MpinFormatDecision =
  | { ok: true; mpin: string }
  | { ok: false; code: 'INVALID_MPIN_FORMAT'; message: string };

/** Exactly 4 numeric digits (0-9). Rejects whitespace, letters, longer/shorter. */
export function validateMpinFormat(raw: unknown): MpinFormatDecision {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'INVALID_MPIN_FORMAT', message: 'MPIN must be exactly 4 digits.' };
  }
  if (!/^\d{4}$/.test(raw)) {
    return { ok: false, code: 'INVALID_MPIN_FORMAT', message: 'MPIN must be exactly 4 digits.' };
  }
  return { ok: true, mpin: raw };
}

export function validateMpinConfirm(mpin: string, confirm: unknown): MpinFormatDecision {
  const a = validateMpinFormat(mpin);
  if (!a.ok) return a;
  const b = validateMpinFormat(confirm);
  if (!b.ok) return b;
  if (a.mpin !== b.mpin) {
    return { ok: false, code: 'INVALID_MPIN_FORMAT', message: 'pin not matched' };
  }
  return a;
}

export type MpinLockDecision =
  | { locked: false }
  | { locked: true; until: Date; message: string };

export function decideMpinLock(params: {
  lockedUntil: Date | string | null | undefined;
  now?: Date;
}): MpinLockDecision {
  const now = params.now ?? new Date();
  if (!params.lockedUntil) return { locked: false };
  const until = params.lockedUntil instanceof Date ? params.lockedUntil : new Date(params.lockedUntil);
  if (Number.isNaN(until.getTime()) || until.getTime() <= now.getTime()) {
    return { locked: false };
  }
  return {
    locked: true,
    until,
    message: 'Too many attempts. Try again later.',
  };
}

/** After a failed verify: increment attempts; lock at threshold. */
export function nextMpinFailureState(params: {
  failedAttempts: number;
  now?: Date;
}): {
  mpinFailedAttempts: number;
  mpinLockedUntil: Date | null;
  justLocked: boolean;
} {
  const now = params.now ?? new Date();
  const next = Math.max(0, params.failedAttempts) + 1;
  if (next >= MPIN_MAX_FAILED_ATTEMPTS) {
    return {
      mpinFailedAttempts: next,
      mpinLockedUntil: new Date(now.getTime() + MPIN_LOCK_MS),
      justLocked: true,
    };
  }
  return { mpinFailedAttempts: next, mpinLockedUntil: null, justLocked: false };
}

/** Customer/Agent with completed profile must set MPIN before app entry. */
export function needsMpinSetup(params: {
  roleCode: string;
  profileCompletedAt: Date | string | null | undefined;
  mpinSetAt: Date | string | null | undefined;
}): boolean {
  const role = String(params.roleCode || '').toUpperCase();
  if (role !== 'CUSTOMER' && role !== 'AGENT') return false;
  if (!params.profileCompletedAt) return false;
  return !params.mpinSetAt;
}

/** Roles allowed to use MPIN quick login. */
export function isMpinEligibleRole(roleCode: string): boolean {
  const role = String(roleCode || '').toUpperCase();
  return role === 'CUSTOMER' || role === 'AGENT';
}

/**
 * Normalize login identifier without revealing existence.
 * Prefer email (lowercased trim); also accept 10-digit mobile.
 */
export function normalizeMpinLoginIdentifier(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes('@')) return s.toLowerCase();
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return s.toLowerCase();
}
