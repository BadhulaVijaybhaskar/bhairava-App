/**
 * Client-facing MPIN setup/reset validation + field copy.
 * Server failures → use @bhairava/api-client `userFacingError` (never raw dumps).
 */

import { MPIN_LENGTH } from './mpin-rules';

export const MPIN_UX = {
  mismatch: 'MPINs do not match. Please enter the same 4-digit MPIN.',
  mismatchRetry: 'MPINs do not match. Please try again.',
  invalidLength: 'Enter a 4-digit MPIN.',
  digitsOnly: 'MPIN can contain numbers only.',
  saveFailed: 'We couldn’t save your MPIN. Please try again.',
} as const;

export type MpinFieldDecision =
  | { ok: true; mpin: string }
  | { ok: false; message: string };

export type MpinPairDecision =
  | { ok: true; mpin: string }
  | { ok: false; field: 'mpin' | 'confirm'; message: string };

/** Strip non-digits and cap at 4 — safe for controlled inputs. */
export function sanitizeMpinInput(raw: string): string {
  return String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, MPIN_LENGTH);
}

/** Validate one MPIN value before sanitize (detects letters, bad length). */
export function validateMpinDigitsInput(raw: unknown): MpinFieldDecision {
  if (typeof raw !== 'string') {
    return { ok: false, message: MPIN_UX.invalidLength };
  }
  if (/[^\d]/.test(raw)) {
    return { ok: false, message: MPIN_UX.digitsOnly };
  }
  if (!new RegExp(`^\\d{${MPIN_LENGTH}}$`).test(raw)) {
    return { ok: false, message: MPIN_UX.invalidLength };
  }
  return { ok: true, mpin: raw };
}

/** Client-side pair check — call before any setup/reset API. */
export function validateMpinSetupPair(mpin: unknown, confirm: unknown): MpinPairDecision {
  const a = validateMpinDigitsInput(mpin);
  if (!a.ok) return { ok: false, field: 'mpin', message: a.message };
  const b = validateMpinDigitsInput(confirm);
  if (!b.ok) return { ok: false, field: 'confirm', message: b.message };
  if (a.mpin !== b.mpin) {
    return { ok: false, field: 'confirm', message: MPIN_UX.mismatch };
  }
  return { ok: true, mpin: a.mpin };
}

/** Submit enabled only when both are exactly 4 digits and equal. */
export function canSubmitMpinSetup(mpin: string, confirm: string): boolean {
  return validateMpinSetupPair(mpin, confirm).ok === true;
}
