/** Shared validation helpers (Zod-free lightweight stubs; expand in Wave 2). */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function isEmail(v: unknown): boolean {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isMobileIn(v: unknown): boolean {
  return typeof v === 'string' && /^[6-9]\d{9}$/.test(v.replace(/\D/g, '').slice(-10));
}
