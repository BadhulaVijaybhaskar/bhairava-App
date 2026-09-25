/**
 * Editable admin data store.
 * Seeds from mock-data and persists local edits to localStorage so every
 * admin screen has real create / edit / delete access without a backend yet.
 *
 * Schema: KEY stays bhairava.admin.v3. schemaVersion inside payload drives
 * domain normalization on load — never wipe existing demo/project records.
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
  leads as seedLeads,
  plots as seedPlots,
  projects as seedProjects,
  reservations as seedReservations,
  siteVisits as seedSiteVisits,
  type Agent,
  type Booking,
  type Customer,
  type Lead,
  type Plot,
  type Project,
  type Reservation,
  type SiteVisit,
} from "@/lib/mock-data";
import {
  migratePersisted,
  normalizeProjectRecord,
  normalizePlots,
  STORE_SCHEMA_VERSION,
} from "@/lib/domain/migrate";
import {
  applyReservationExpiry,
  type CancelRequest,
} from "@/lib/domain/sales";
import type {
  CommissionRecord,
  CommissionRule,
  FinancePayment,
  PaymentAdjustment,
  PaymentScheduleItem,
} from "@/lib/domain/finance";
import { buildFinanceDemoSeed, mergeFinanceSeed } from "@/lib/domain/finance-seed";
import type { ProjectDocument, RegistrationCase, ResaleCase } from "@/lib/domain/operations";
import { buildOperationsDemoSeed, mergeOperationsSeed } from "@/lib/domain/operations-seed";
import { documents as seedDocuments, registrations as seedRegistrations } from "@/lib/mock-data";

const KEY = "bhairava.admin.v3";

interface Persisted {
  schemaVersion?: number;
  projects?: Project[];
  customers?: Customer[];
  agents?: Agent[];
  leads?: Lead[];
  extraPlots?: Plot[];
  extraBookings?: Booking[];
  extraReservations?: Reservation[];
  extraVisits?: SiteVisit[];
  cancelRequests?: CancelRequest[];
  financePayments?: FinancePayment[];
  paymentSchedules?: PaymentScheduleItem[];
  paymentAdjustments?: PaymentAdjustment[];
  commissions?: CommissionRecord[];
  commissionRules?: CommissionRule[];
  financeSeededProjects?: string[];
  opsDocuments?: ProjectDocument[];
  opsRegistrations?: RegistrationCase[];
  opsResales?: ResaleCase[];
  opsSeededProjects?: string[];
}

interface Data {
  projects: Project[];
  customers: Customer[];
  agents: Agent[];
  leads: Lead[];
  plots: Plot[];
  bookings: Booking[];
  reservations: Reservation[];
  siteVisits: SiteVisit[];
  cancelRequests: CancelRequest[];
  financePayments: FinancePayment[];
  paymentSchedules: PaymentScheduleItem[];
  paymentAdjustments: PaymentAdjustment[];
  commissions: CommissionRecord[];
  commissionRules: CommissionRule[];
  opsDocuments: ProjectDocument[];
  opsRegistrations: RegistrationCase[];
  opsResales: ResaleCase[];
}

interface Ctx extends Data {
  saveProject: (p: Project) => void;
  removeProject: (id: string) => void;
  saveCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  saveAgent: (a: Agent) => void;
  removeAgent: (id: string) => void;
  saveLead: (l: Lead) => void;
  removeLead: (id: string) => void;
  savePlot: (p: Plot) => void;
  removePlot: (id: string) => void;
  saveBooking: (b: Booking) => void;
  removeBooking: (id: string) => void;
  saveReservation: (r: Reservation) => void;
  removeReservation: (id: string) => void;
  saveVisit: (v: SiteVisit) => void;
  saveSiteVisit: (v: SiteVisit) => void;
  removeSiteVisit: (id: string) => void;
  saveCancelRequest: (c: CancelRequest) => void;
  saveFinancePayment: (p: FinancePayment) => void;
  savePaymentSchedule: (item: PaymentScheduleItem) => void;
  savePaymentAdjustment: (a: PaymentAdjustment) => void;
  saveCommission: (c: CommissionRecord) => void;
  saveCommissionRule: (r: CommissionRule) => void;
  ensureFinanceSeed: (projectId: string) => void;
  saveOpsDocument: (d: ProjectDocument) => void;
  saveOpsRegistration: (r: RegistrationCase) => void;
  saveOpsResale: (r: ResaleCase) => void;
  ensureOpsSeed: (projectId: string) => void;
  /** Re-evaluate reservation expiry deterministically (load/action). */
  refreshReservationExpiry: () => void;
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

const seedProjectsNormalized: Project[] = seedProjects.map(
  (p) => normalizeProjectRecord({ ...p } as Record<string, unknown>) as unknown as Project,
);

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
    projects: seedProjectsNormalized,
    customers: seedCustomers,
    agents: seedAgents,
    leads: seedLeads,
  });
  const [extraPlots, setExtraPlots] = useState<Plot[]>([]);
  const [extraBookings, setExtraBookings] = useState<Booking[]>([]);
  const [extraReservations, setExtraReservations] = useState<Reservation[]>([]);
  const [extraVisits, setExtraVisits] = useState<SiteVisit[]>([]);
  const [cancelRequests, setCancelRequests] = useState<CancelRequest[]>([]);
  const [financePayments, setFinancePayments] = useState<FinancePayment[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentScheduleItem[]>([]);
  const [paymentAdjustments, setPaymentAdjustments] = useState<PaymentAdjustment[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [financeSeededProjects, setFinanceSeededProjects] = useState<string[]>([]);
  const [opsDocuments, setOpsDocuments] = useState<ProjectDocument[]>([]);
  const [opsRegistrations, setOpsRegistrations] = useState<RegistrationCase[]>([]);
  const [opsResales, setOpsResales] = useState<ResaleCase[]>([]);
  const [opsSeededProjects, setOpsSeededProjects] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        // still evaluate seed reservation expiry on first load
        return;
      }
      const parsed = JSON.parse(raw) as Persisted;
      const migrated = migratePersisted(parsed);
      const hasProjects = Array.isArray(parsed.projects);
      const hasCustomers = Array.isArray(parsed.customers);
      const hasAgents = Array.isArray(parsed.agents);
      const hasLeads = Array.isArray(parsed.leads);
      if (hasProjects || hasCustomers || hasAgents || hasLeads) {
        setCore({
          projects: hasProjects
            ? ((migrated.projects as unknown as Project[]) ?? seedProjectsNormalized)
            : seedProjectsNormalized,
          customers: hasCustomers ? (parsed.customers as Customer[]) : seedCustomers,
          agents: hasAgents ? (parsed.agents as Agent[]) : seedAgents,
          leads: hasLeads ? (parsed.leads as Lead[]) : seedLeads,
        });
      }
      if (Array.isArray(parsed.extraPlots)) {
        setExtraPlots((migrated.extraPlots as unknown as Plot[]) ?? []);
      }
      if (parsed.extraBookings) setExtraBookings(parsed.extraBookings);
      if (parsed.extraReservations) {
        setExtraReservations(applyReservationExpiry(parsed.extraReservations));
      }
      if (parsed.extraVisits) setExtraVisits(parsed.extraVisits);
      if (parsed.cancelRequests) setCancelRequests(parsed.cancelRequests);
      if (parsed.financePayments) setFinancePayments(parsed.financePayments);
      if (parsed.paymentSchedules) setPaymentSchedules(parsed.paymentSchedules);
      if (parsed.paymentAdjustments) setPaymentAdjustments(parsed.paymentAdjustments);
      if (parsed.commissions) setCommissions(parsed.commissions);
      if (parsed.commissionRules) setCommissionRules(parsed.commissionRules);
      if (parsed.financeSeededProjects) setFinanceSeededProjects(parsed.financeSeededProjects);
      if (parsed.opsDocuments) setOpsDocuments(parsed.opsDocuments);
      if (parsed.opsRegistrations) setOpsRegistrations(parsed.opsRegistrations);
      if (parsed.opsResales) setOpsResales(parsed.opsResales);
      if (parsed.opsSeededProjects) setOpsSeededProjects(parsed.opsSeededProjects);
    } catch {
      /* ignore corrupt storage — keep seed data */
    }
  }, []);

  const persist = useCallback(
    (next: {
      projects: Project[];
      customers: Customer[];
      agents: Agent[];
      leads: Lead[];
      extraPlots: Plot[];
      extraBookings: Booking[];
      extraReservations: Reservation[];
      extraVisits: SiteVisit[];
      cancelRequests: CancelRequest[];
      financePayments: FinancePayment[];
      paymentSchedules: PaymentScheduleItem[];
      paymentAdjustments: PaymentAdjustment[];
      commissions: CommissionRecord[];
      commissionRules: CommissionRule[];
      financeSeededProjects: string[];
      opsDocuments: ProjectDocument[];
      opsRegistrations: RegistrationCase[];
      opsResales: ResaleCase[];
      opsSeededProjects: string[];
    }) => {
      try {
        const payload: Persisted = {
          schemaVersion: STORE_SCHEMA_VERSION,
          projects: next.projects.map(
            (p) =>
              normalizeProjectRecord({ ...p } as Record<string, unknown>) as unknown as Project,
          ),
          customers: next.customers,
          agents: next.agents,
          leads: next.leads,
          extraPlots: normalizePlots(
            next.extraPlots as unknown as Record<string, unknown>[],
          ) as unknown as Plot[],
          extraBookings: next.extraBookings,
          extraReservations: next.extraReservations,
          extraVisits: next.extraVisits,
          cancelRequests: next.cancelRequests,
          financePayments: next.financePayments,
          paymentSchedules: next.paymentSchedules,
          paymentAdjustments: next.paymentAdjustments,
          commissions: next.commissions,
          commissionRules: next.commissionRules,
          financeSeededProjects: next.financeSeededProjects,
          opsDocuments: next.opsDocuments,
          opsRegistrations: next.opsRegistrations,
          opsResales: next.opsResales,
          opsSeededProjects: next.opsSeededProjects,
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
        leads: Lead[];
        extraPlots: Plot[];
        extraBookings: Booking[];
        extraReservations: Reservation[];
        extraVisits: SiteVisit[];
        cancelRequests: CancelRequest[];
        financePayments: FinancePayment[];
        paymentSchedules: PaymentScheduleItem[];
        paymentAdjustments: PaymentAdjustment[];
        commissions: CommissionRecord[];
        commissionRules: CommissionRule[];
        financeSeededProjects: string[];
        opsDocuments: ProjectDocument[];
        opsRegistrations: RegistrationCase[];
        opsResales: ResaleCase[];
        opsSeededProjects: string[];
      }>,
    ) => {
      const next = {
        projects: patch.projects ?? core.projects,
        customers: patch.customers ?? core.customers,
        agents: patch.agents ?? core.agents,
        leads: patch.leads ?? core.leads,
        extraPlots: patch.extraPlots ?? extraPlots,
        extraBookings: patch.extraBookings ?? extraBookings,
        extraReservations: patch.extraReservations ?? extraReservations,
        extraVisits: patch.extraVisits ?? extraVisits,
        cancelRequests: patch.cancelRequests ?? cancelRequests,
        financePayments: patch.financePayments ?? financePayments,
        paymentSchedules: patch.paymentSchedules ?? paymentSchedules,
        paymentAdjustments: patch.paymentAdjustments ?? paymentAdjustments,
        commissions: patch.commissions ?? commissions,
        commissionRules: patch.commissionRules ?? commissionRules,
        financeSeededProjects: patch.financeSeededProjects ?? financeSeededProjects,
        opsDocuments: patch.opsDocuments ?? opsDocuments,
        opsRegistrations: patch.opsRegistrations ?? opsRegistrations,
        opsResales: patch.opsResales ?? opsResales,
        opsSeededProjects: patch.opsSeededProjects ?? opsSeededProjects,
      };
      persist(next);
    },
    [core, extraPlots, extraBookings, extraReservations, extraVisits, cancelRequests, financePayments, paymentSchedules, paymentAdjustments, commissions, commissionRules, financeSeededProjects, opsDocuments, opsRegistrations, opsResales, opsSeededProjects, persist],
  );

  const upsertCore = useCallback(
    <K extends "projects" | "customers" | "agents" | "leads">(key: K, item: Data[K][number]) => {
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
    (key: "projects" | "customers" | "agents" | "leads", id: string) => {
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
      leads: core.leads,
      plots: mergeById(seedPlots, extraPlots),
      bookings: mergeById(seedBookings, extraBookings),
      reservations: applyReservationExpiry(mergeById(seedReservations, extraReservations)),
      siteVisits: mergeById(seedSiteVisits, extraVisits),
      cancelRequests,
      financePayments,
      paymentSchedules,
      paymentAdjustments,
      commissions,
      commissionRules,
      opsDocuments,
      opsRegistrations,
      opsResales,
      saveProject: (p) =>
        upsertCore(
          "projects",
          normalizeProjectRecord({ ...p } as Record<string, unknown>) as unknown as Project,
        ),
      removeProject: (id) => removeCore("projects", id),
      saveCustomer: (c) => upsertCore("customers", c),
      removeCustomer: (id) => removeCore("customers", id),
      saveAgent: (a) => upsertCore("agents", a),
      removeAgent: (id) => removeCore("agents", id),
      saveLead: (l) => upsertCore("leads", l),
      removeLead: (id) => removeCore("leads", id),
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
          const evaluated = applyReservationExpiry([r])[0] ?? r;
          const next = upsertExtra(prev, evaluated);
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
      saveCancelRequest: (c) => {
        setCancelRequests((prev) => {
          const next = upsertExtra(prev, c);
          snapshot({ cancelRequests: next });
          return next;
        });
      },
      saveFinancePayment: (p) => {
        setFinancePayments((prev) => {
          const next = upsertExtra(prev, p);
          snapshot({ financePayments: next });
          return next;
        });
      },
      savePaymentSchedule: (item) => {
        setPaymentSchedules((prev) => {
          const next = upsertExtra(prev, item);
          snapshot({ paymentSchedules: next });
          return next;
        });
      },
      savePaymentAdjustment: (a) => {
        setPaymentAdjustments((prev) => {
          const next = upsertExtra(prev, a);
          snapshot({ paymentAdjustments: next });
          return next;
        });
      },
      saveCommission: (c) => {
        setCommissions((prev) => {
          const next = upsertExtra(prev, c);
          snapshot({ commissions: next });
          return next;
        });
      },
      saveCommissionRule: (r) => {
        setCommissionRules((prev) => {
          const next = upsertExtra(prev, r);
          snapshot({ commissionRules: next });
          return next;
        });
      },
      saveOpsDocument: (d) => {
        setOpsDocuments((prev) => {
          const next = upsertExtra(prev, d);
          snapshot({ opsDocuments: next });
          return next;
        });
      },
      saveOpsRegistration: (r) => {
        setOpsRegistrations((prev) => {
          const next = upsertExtra(prev, r);
          snapshot({ opsRegistrations: next });
          return next;
        });
      },
      saveOpsResale: (r) => {
        setOpsResales((prev) => {
          const next = upsertExtra(prev, r);
          snapshot({ opsResales: next });
          return next;
        });
      },
      ensureOpsSeed: (projectId) => {
        if (opsSeededProjects.includes(projectId)) return;
        const bookingsNow = mergeById(seedBookings, extraBookings);
        const plotsNow = mergeById(seedPlots, extraPlots);
        const demo = buildOperationsDemoSeed({
          projectId,
          bookings: bookingsNow,
          plots: plotsNow,
          documents: seedDocuments,
          registrations: seedRegistrations,
        });
        const merged = mergeOperationsSeed(
          {
            documents: opsDocuments,
            registrations: opsRegistrations,
            resales: opsResales,
          },
          demo,
        );
        setOpsDocuments(merged.documents);
        setOpsRegistrations(merged.registrations);
        setOpsResales(merged.resales);
        const nextSeeded = [...opsSeededProjects, projectId];
        setOpsSeededProjects(nextSeeded);
        snapshot({
          opsDocuments: merged.documents,
          opsRegistrations: merged.registrations,
          opsResales: merged.resales,
          opsSeededProjects: nextSeeded,
        });
      },
      ensureFinanceSeed: (projectId) => {
        if (financeSeededProjects.includes(projectId)) return;
        const bookingsNow = mergeById(seedBookings, extraBookings);
        const demo = buildFinanceDemoSeed(bookingsNow, projectId);
        const merged = mergeFinanceSeed(
          {
            schedules: paymentSchedules,
            payments: financePayments,
            adjustments: paymentAdjustments,
            commissions,
            rules: commissionRules,
          },
          demo,
        );
        setPaymentSchedules(merged.schedules);
        setFinancePayments(merged.payments);
        setPaymentAdjustments(merged.adjustments);
        setCommissions(merged.commissions);
        setCommissionRules(merged.rules);
        const nextSeeded = [...financeSeededProjects, projectId];
        setFinanceSeededProjects(nextSeeded);
        snapshot({
          paymentSchedules: merged.schedules,
          financePayments: merged.payments,
          paymentAdjustments: merged.adjustments,
          commissions: merged.commissions,
          commissionRules: merged.rules,
          financeSeededProjects: nextSeeded,
        });
      },
      refreshReservationExpiry: () => {
        setExtraReservations((prev) => {
          const next = applyReservationExpiry(prev);
          snapshot({ extraReservations: next });
          return next;
        });
      },
      reset: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        setCore({
          projects: seedProjectsNormalized,
          customers: seedCustomers,
          agents: seedAgents,
          leads: seedLeads,
        });
        setExtraPlots([]);
        setExtraBookings([]);
        setExtraReservations([]);
        setExtraVisits([]);
        setCancelRequests([]);
        setFinancePayments([]);
        setPaymentSchedules([]);
        setPaymentAdjustments([]);
        setCommissions([]);
        setCommissionRules([]);
        setFinanceSeededProjects([]);
        setOpsDocuments([]);
        setOpsRegistrations([]);
        setOpsResales([]);
        setOpsSeededProjects([]);
      },
      nextId: (prefix, list) => {
        let max = 0;
        let pad = prefix === "Br" ? 6 : prefix === "brag" ? 4 : 2;
        for (const x of list) {
          if (!x.id.startsWith(prefix)) continue;
          const m = /(\d+)$/.exec(x.id);
          if (!m?.[1]) continue;
          pad = Math.max(pad, m[1].length);
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
      cancelRequests,
      financePayments,
      paymentSchedules,
      paymentAdjustments,
      commissions,
      commissionRules,
      financeSeededProjects,
      opsDocuments,
      opsRegistrations,
      opsResales,
      opsSeededProjects,
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
