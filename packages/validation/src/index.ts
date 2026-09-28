/** Shared validation helpers (Zod-free lightweight stubs). */

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isEmail(v: unknown): boolean {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Normalize Indian mobile to last-10 digits starting 6-9.
 * Accepts +91, 0-prefix, spaces/dashes. Returns null if invalid.
 */
export function normalizePhoneIn(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(last10)) return null;
  return last10;
}

export function isMobileIn(v: unknown): boolean {
  return normalizePhoneIn(v) !== null;
}

/** Stable system agent code for the org sales desk. */
export const BHAIRAVA_DIRECT_CODE = 'BHAIRAVA_DIRECT';

export const ATTRIBUTION_SOURCES = [
  'DIRECT_APP',
  'AGENT_INVITE',
  'ADMIN_CREATED',
  'REFERRAL',
  'OTHER',
] as const;
export type AttributionSourceCode = (typeof ATTRIBUTION_SOURCES)[number];
