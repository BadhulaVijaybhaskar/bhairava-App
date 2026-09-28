import { userFacingError } from '@bhairava/api-client';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/** Money fields from the API are integer paise serialized as strings. */
export function formatPaise(paise: string | number | null | undefined): string {
  if (paise === null || paise === undefined || paise === '') return '—';
  const n = Number(paise);
  return Number.isFinite(n) ? inr.format(n / 100) : '—';
}

export function sumPaise(values: Array<string | number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (Number(v) || 0), 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatArea(sqYd: string | number | null | undefined): string {
  if (sqYd === null || sqYd === undefined || sqYd === '') return '—';
  const n = Number(sqYd);
  return Number.isFinite(n) ? `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} sq yd` : String(sqYd);
}

/** `UNDER_DOCUMENTATION` → `Under documentation`. */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PAYMENT_METHODS: Record<string, string> = {
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  OTHER: 'Other',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  return method ? PAYMENT_METHODS[method] ?? humanize(method) : '—';
}

export function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 8 ? `#${id.slice(-6).toUpperCase()}` : `#${id.toUpperCase()}`;
}

export function errorMessage(error: unknown): string {
  return userFacingError(error);
}
