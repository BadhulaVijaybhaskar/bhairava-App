import { useCallback, useEffect, useState } from 'react';
import { userFacingError } from '@bhairava/api-client';
import { tokens } from '../api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRow = Record<string, any>;

export const DASH = '—';

export function errMsg(e: unknown): string {
  return userFacingError(e);
}

export function useAuthed() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    void Promise.resolve(tokens.getAccessToken()).then((t: string | null) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);
  return { ready, authed, setAuthed };
}

export function useAsyncList(loader: () => Promise<AnyRow[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setErr('');
    loader()
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch((e) => setErr(errMsg(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, err, loading, reload };
}

/** Rows keyed for `DataTable`, which requires an `id`. */
export function withIds(rows: AnyRow[]): Array<AnyRow & { id: string | number }> {
  return rows.map((r, i) => (r.id == null ? { ...r, id: `row-${i}` } : r)) as Array<AnyRow & { id: string | number }>;
}

export function display(v: unknown): string {
  if (v === null || v === undefined || v === '') return DASH;
  return String(v);
}

/** `ON_HOLD` → `On hold` so `Chip` tone matching works on API enum values. */
export function humanize(v: unknown): string {
  if (v === null || v === undefined || v === '') return DASH;
  const s = String(v).replace(/[_-]+/g, ' ').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPaise(paise: unknown): string {
  if (paise === null || paise === undefined || paise === '') return DASH;
  const n = Number(paise) / 100;
  if (!Number.isFinite(n)) return String(paise);
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

/** Paise strings from the API (BigInt-serialized) → `bigint`; blanks and garbage → `0n`. */
export function toPaise(v: unknown): bigint {
  if (v === null || v === undefined || v === '') return 0n;
  try {
    return BigInt(String(v));
  } catch {
    return 0n;
  }
}

export function sumPaise(rows: AnyRow[], key: string): bigint {
  return rows.reduce((acc, r) => acc + toPaise(r[key]), 0n);
}

/** For rupee-denominated Decimal columns (e.g. `plot.totalPrice`). */
export function formatRupees(v: unknown): string {
  if (v === null || v === undefined || v === '') return DASH;
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function formatDate(v: unknown): string {
  if (!v) return DASH;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(v: unknown): string {
  if (!v) return DASH;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function shortId(v: unknown): string {
  if (!v) return DASH;
  const s = String(v);
  return s.length > 12 ? `${s.slice(0, 8)}…` : s;
}

export function matchesQuery(row: AnyRow, query: string, keys: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q));
}
