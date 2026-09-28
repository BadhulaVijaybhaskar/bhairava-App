import { userFacingError } from '@bhairava/api-client';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const count = new Intl.NumberFormat('en-IN');

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function text(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  return s ? s : fallback;
}

/** API money fields ending in `Paise` are integer paise serialised as strings. */
export function formatPaise(value: unknown): string {
  const n = toNumber(value);
  return n === null ? '—' : inr.format(n / 100);
}

export function formatRupees(value: unknown): string {
  const n = toNumber(value);
  return n === null ? '—' : inr.format(n);
}

export function formatNumber(value: unknown, suffix = ''): string {
  const n = toNumber(value);
  return n === null ? '—' : count.format(n) + suffix;
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: unknown): string {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** `UNDER_DOCUMENTATION` → `Under documentation` (Chip tones match on the lowercased label). */
export function humanize(value: unknown): string {
  const s = text(value, '');
  if (!s) return 'Unknown';
  const spaced = s.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function shortRef(id: unknown): string {
  const s = text(id, '');
  return s ? s.slice(-8).toUpperCase() : '—';
}

export function errorMessage(e: unknown): string {
  return userFacingError(e);
}

/** Value for `<input type="datetime-local">` in the browser's local time zone. */
export function toLocalDateTimeInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
