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
  bookings as seedBookings,
  customers as seedCustomers,
  plots as seedPlots,
  projects as seedProjects,
  reservations as seedReservations,
  siteVisits as seedSiteVisits,
  type Agent,
  type Booking,
  type Customer,
  type Plot,
  type Project,
  type Reservation,
  type SiteVisit,
} from "@/lib/mock-data";

const KEY = "bhairava.admin.v2";

interface Persisted {
  projects?: Project[];
  customers?: Customer[];
  agents?: Agent[];
  extraPlots?: Plot[];
  extraBookings?: Booking[];
  extraReservations?: Reservation[];
  extraVisits?: SiteVisit[];
}

interface Data {
  projects: Project[];
  customers: Customer[];
  agents: Agent[];
  plots: Plot[];
  bookings: Booking[];
  reservations: Reservation[];
  siteVisits: SiteVisit[];
}

interface Ctx extends Data {
  saveProject: (p: Project) => void;
  removeProject: (id: string) => void;
  saveCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  saveAgent: (a: Agent) => void;
  removeAgent: (id: string) => void;
  savePlot: (p: Plot) => void;
  removePlot: (id: string) => void;
  saveBooking: (b: Booking) => void;
  removeBooking: (id: string) => void;
  saveReservation: (r: Reservation) => void;
  removeReservation: (id: string) => void;
  saveVisit: (v: SiteVisit) => void;
  saveSiteVisit: (v: SiteVisit) => void;
  removeSiteVisit: (id: string) => void;
  reset: () => void;
  nextId: (prefix: string, list: { id: string }[]) => string;
}

const mergeById = <T extends { id: string }>(seed: T[], extra: T[] = []): T[] => {
  const seedIds = new Set(seed.map((s) => s.id));
  const overlay = new Map(extra.map((x) => [x.id, x]));
  const created = extra.filter((x) => !seedIds.has(x.id));
  const mergedSeed = seed.map((s) => overlay.get(s.id) ?? s);
  return [...created, ...mergedSeed];
};

const seed = (): Data => ({
  projects: seedProjects,
  customers: seedCustomers,
  agents: seedAgents,
  plots: seedPlots,
  bookings: seedBookings,
  reservations: seedReservations,
  siteVisits: seedSiteVisits,
});

const DataContext = createContext<Ctx | null>(null);

export function defaultPlotPolygon(index: number): [number, number][] {
  const col = index % 10;
  const row = Math.floor(index / 10) % 8;
  const w = 7.2;
  const h = 8;
  const x = 5 + col * 9;
  const y = 6 + row * 10.5;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [core, setCore] = useState({
    projects: seedProjects,
    customers: seedCustomers,
    agents: seedAgents,
  });
  const [extraPlots, setExtraPlots] = useState<Plot[]>([]);
  const [extraBookings, setExtraBookings] = useState<Booking[]>([]);
  const [extraReservations, setExtraReservations] = useState<Reservation[]>([]);
  const [extraVisits, setExtraVisits] = useState<SiteVisit[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed.projects || parsed.customers || parsed.agents) {
        setCore({
          projects: parsed.projects ?? seedProjects,
          customers: parsed.customers ?? seedCustomers,
          agents: parsed.agents ?? seedAgents,
        });
      }
      if (parsed.extraPlots) setExtraPlots(parsed.extraPlots);
      if (parsed.extraBookings) setExtraBookings(parsed.extraBookings);
      if (parsed.extraReservations) setExtraReservations(parsed.extraReservations);
      if (parsed.extraVisits) setExtraVisits(parsed.extraVisits);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback(
    (next: {
      projects: Project[];
      customers: Customer[];
      agents: Agent[];
      extraPlots: Plot[];
      extraBookings: Booking[];
      extraReservations: Reservation[];
      extraVisits: SiteVisit[];
    }) => {
      try {
        const payload: Persisted = {
          projects: next.projects,
          customers: next.customers,
          agents: next.agents,
          extraPlots: next.extraPlots,
          extraBookings: next.extraBookings,
          extraReservations: next.extraReservations,
          extraVisits: next.extraVisits,
        };
        localStorage.setItem(KEY, JSON.stringify(payload));
      } catch {
        /* quota / private mode */
      }
    },
    [],
  );

  const snapshot = useCallback(
    (
      patch: Partial<{
        projects: Project[];
        customers: Customer[];
        agents: Agent[];
        extraPlots: Plot[];
        extraBookings: Booking[];
        extraReservations: Reservation[];
        extraVisits: SiteVisit[];
      }>,
    ) => {
      const next = {
        projects: patch.projects ?? core.projects,
        customers: patch.customers ?? core.customers,
        agents: patch.agents ?? core.agents,
        extraPlots: patch.extraPlots ?? extraPlots,
        extraBookings: patch.extraBookings ?? extraBookings,
        extraReservations: patch.extraReservations ?? extraReservations,
        extraVisits: patch.extraVisits ?? extraVisits,
      };
      persist(next);
    },
    [core, extraPlots, extraBookings, extraReservations, extraVisits, persist],
  );

  const upsertCore = useCallback(
    <K extends "projects" | "customers" | "agents">(key: K, item: Data[K][number]) => {
      setCore((prev) => {
        const list = prev[key] as { id: string }[];
        const exists = list.some((x) => x.id === item.id);
        const nextList = exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
        const next = { ...prev, [key]: nextList };
        snapshot({ [key]: nextList } as never);
        return next;
      });
    },
    [snapshot],
  );

  const removeCore = useCallback(
    (key: "projects" | "customers" | "agents", id: string) => {
      setCore((prev) => {
        const next = {
          ...prev,
          [key]: (prev[key] as { id: string }[]).filter((x) => x.id !== id),
        };
        snapshot({ [key]: next[key] } as never);
        return next;
      });
    },
    [snapshot],
  );

  const upsertExtra = useCallback(<T extends { id: string }>(list: T[], item: T) => {
    const exists = list.some((x) => x.id === item.id);
    return exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      projects: core.projects,
      customers: core.customers,
      agents: core.agents,
      plots: mergeById(seedPlots, extraPlots),
      bookings: mergeById(seedBookings, extraBookings),
      reservations: mergeById(seedReservations, extraReservations),
      siteVisits: mergeById(seedSiteVisits, extraVisits),
      saveProject: (p) => upsertCore("projects", p),
      removeProject: (id) => removeCore("projects", id),
      saveCustomer: (c) => upsertCore("customers", c),
      removeCustomer: (id) => removeCore("customers", id),
      saveAgent: (a) => upsertCore("agents", a),
      removeAgent: (id) => removeCore("agents", id),
      savePlot: (p) => {
        setExtraPlots((prev) => {
          const next = upsertExtra(prev, p);
          snapshot({ extraPlots: next });
          return next;
        });
      },
      removePlot: (id) => {
        setExtraPlots((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ extraPlots: next });
          return next;
        });
      },
      saveBooking: (b) => {
        setExtraBookings((prev) => {
          const next = upsertExtra(prev, b);
          snapshot({ extraBookings: next });
          return next;
        });
      },
      removeBooking: (id) => {
        setExtraBookings((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ extraBookings: next });
          return next;
        });
      },
      saveReservation: (r) => {
        setExtraReservations((prev) => {
          const next = upsertExtra(prev, r);
          snapshot({ extraReservations: next });
          return next;
        });
      },
      removeReservation: (id) => {
        setExtraReservations((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ extraReservations: next });
          return next;
        });
      },
      saveVisit: (v) => {
        setExtraVisits((prev) => {
          const next = upsertExtra(prev, v);
          snapshot({ extraVisits: next });
          return next;
        });
      },
      saveSiteVisit: (v) => {
        setExtraVisits((prev) => {
          const next = upsertExtra(prev, v);
          snapshot({ extraVisits: next });
          return next;
        });
      },
      removeSiteVisit: (id) => {
        setExtraVisits((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ extraVisits: next });
          return next;
        });
      },
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setCore({ projects: seedProjects, customers: seedCustomers, agents: seedAgents });
        setExtraPlots([]);
        setExtraBookings([]);
        setExtraReservations([]);
        setExtraVisits([]);
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
    [
      core,
      extraPlots,
      extraBookings,
      extraReservations,
      extraVisits,
      upsertCore,
      removeCore,
      upsertExtra,
      snapshot,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
