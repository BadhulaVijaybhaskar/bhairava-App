/**
 * Editable admin data store.
 * Seeds from mock-data and persists local edits to localStorage so every
 * admin screen has real create / edit / delete access without a backend yet.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  agents as seedAgents,
  customers as seedCustomers,
  projects as seedProjects,
  type Agent,
  type Customer,
  type Project,
} from "@/lib/mock-data";

const KEY = "bhairava.admin.v1";

interface Data {
  projects: Project[];
  customers: Customer[];
  agents: Agent[];
}

interface Ctx extends Data {
  saveProject: (p: Project) => void;
  removeProject: (id: string) => void;
  saveCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  saveAgent: (a: Agent) => void;
  removeAgent: (id: string) => void;
  reset: () => void;
  nextId: (prefix: string, list: { id: string }[]) => string;
}

const seed = (): Data => ({
  projects: seedProjects,
  customers: seedCustomers,
  agents: seedAgents,
});

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(seed);

  // hydrate after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...seed(), ...(JSON.parse(raw) as Partial<Data>) });
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback((next: Data) => {
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }, []);

  const upsert = useCallback(
    <K extends keyof Data>(key: K, item: Data[K][number]) => {
      setData((prev) => {
        const list = prev[key] as { id: string }[];
        const exists = list.some((x) => x.id === item.id);
        const nextList = exists
          ? list.map((x) => (x.id === item.id ? item : x))
          : [item, ...list];
        const next = { ...prev, [key]: nextList } as Data;
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const remove = useCallback((key: keyof Data, id: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        [key]: (prev[key] as { id: string }[]).filter((x) => x.id !== id),
      } as Data;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...data,
      saveProject: (p) => upsert("projects", p),
      removeProject: (id) => remove("projects", id),
      saveCustomer: (c) => upsert("customers", c),
      removeCustomer: (id) => remove("customers", id),
      saveAgent: (a) => upsert("agents", a),
      removeAgent: (id) => remove("agents", id),
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        persist(seed());
      },
      nextId: (prefix, list) => {
        let max = 0;
        let pad = 2;
        for (const x of list) {
          const m = /(\d+)$/.exec(x.id);
          if (!m?.[1]) continue;
          pad = m[1].length;
          max = Math.max(max, Number(m[1]));
        }
        return `${prefix}${String(max + 1).padStart(pad, "0")}`;
      },
    }),
    [data, upsert, remove, persist],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
