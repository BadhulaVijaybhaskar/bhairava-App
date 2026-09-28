import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { errorMessage } from './format';

export type Row = { id: string } & Record<string, any>;

export type RowsState<T = Row> = {
  rows: T[];
  err: string;
  loading: boolean;
  reload: () => void;
};

/** Loads an ownership-scoped list from the live API. */
export function useRows<T = Row>(loader: () => Promise<unknown>, deps: unknown[] = []): RowsState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    loader()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? (data as T[]) : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setErr(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { rows, err, loading, reload };
}

export type RecordState<T = Row> = {
  record: T | null;
  err: string;
  loading: boolean;
};

export function useRecord<T = Row>(loader: (() => Promise<unknown>) | null, deps: unknown[] = []): RecordState<T> {
  const [record, setRecord] = useState<T | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(Boolean(loader));

  useEffect(() => {
    if (!loader) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr('');
    loader()
      .then((data) => {
        if (!cancelled) setRecord((data as T) ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        setRecord(null);
        setErr(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { record, err, loading };
}

/** Project id → name for rows that only carry `projectId` (agent-visible projects only). */
export function useProjectNames() {
  const projects = useRows(() => api.projects.list());
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects.rows) map.set(p.id, p.name);
    return map;
  }, [projects.rows]);
}
