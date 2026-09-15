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
  appUsers as seedUsers,
  auditLog as seedAudit,
  bookings as seedBookings,
  customers as seedCustomers,
  documents as seedDocuments,
  notifications as seedNotifications,
  payments as seedPayments,
  plots as seedPlots,
  projects as seedProjects,
  registrations as seedRegistrations,
  reservations as seedReservations,
  siteVisits as seedSiteVisits,
  type Agent,
  type AppUser,
  type AuditEntry,
  type Booking,
  type Customer,
  type DocumentRecord,
  type NotificationItem,
  type Payment,
  type Plot,
  type Project,
  type Registration,
  type Reservation,
  type SiteVisit,
} from "@/lib/mock-data";
import { defaultCompanySettings, type CompanySettings } from "@/lib/company";
import { getSession } from "@/lib/auth";
import { canChangeRole, canDemoteFounder, canRemoveMember } from "@/lib/permissions";

const KEY = "bhairava.admin.v4";

interface Persisted {
  projects?: Project[];
  customers?: Customer[];
  agents?: Agent[];
  extraPlots?: Plot[];
  extraBookings?: Booking[];
  extraReservations?: Reservation[];
  extraVisits?: SiteVisit[];
  workspaceUsers?: AppUser[];
  auditEntries?: AuditEntry[];
  companySettings?: CompanySettings;
  documents?: DocumentRecord[];
  payments?: Payment[];
  registrations?: Registration[];
  notifications?: NotificationItem[];
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

export type LogAuditInput = {
  actor?: string;
  action: string;
  object: string;
  before?: string;
  after?: string;
  timestamp?: string;
};

interface Ctx extends Data {
  workspaceUsers: AppUser[];
  auditEntries: AuditEntry[];
  companySettings: CompanySettings;
  documents: DocumentRecord[];
  payments: Payment[];
  registrations: Registration[];
  notifications: NotificationItem[];
  currentUser: AppUser | null;

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

  saveUser: (u: AppUser) => void;
  updateUserRole: (id: string, role: AppUser["role"]) => { ok: boolean; error?: string };
  updateUserStatus: (id: string, status: AppUser["status"]) => { ok: boolean; error?: string };
  removeUser: (id: string) => { ok: boolean; error?: string };
  inviteUser: (
    email: string,
    role: AppUser["role"],
  ) => { ok: boolean; error?: string; user?: AppUser };
  resendInvitation: (id: string) => { ok: boolean; error?: string };
  revokeInvitation: (id: string) => { ok: boolean; error?: string };

  logAudit: (entry: LogAuditInput) => void;
  saveCompanySettings: (s: CompanySettings) => void;
  saveDocument: (d: DocumentRecord) => void;
  removeDocument: (id: string) => void;
  savePayment: (p: Payment) => void;
  removePayment: (id: string) => void;
  saveRegistration: (r: Registration) => void;
  removeRegistration: (id: string) => void;
  saveNotification: (n: NotificationItem) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;

  reset: () => void;
  deleteWorkspace: () => void;
  nextId: (prefix: string, list: { id: string }[]) => string;
}

const mergeById = <T extends { id: string }>(seed: T[], extra: T[] = []): T[] => {
  const seedIds = new Set(seed.map((s) => s.id));
  const overlay = new Map(extra.map((x) => [x.id, x]));
  const created = extra.filter((x) => !seedIds.has(x.id));
  const mergedSeed = seed.map((s) => overlay.get(s.id) ?? s);
  return [...created, ...mergedSeed];
};

const resolveCurrentUser = (users: AppUser[]): AppUser | null => {
  const session = getSession();
  if (!session) return users.find((u) => u.role === "Founder" && u.status === "Active") ?? null;
  return (
    users.find((u) => u.email.toLowerCase() === session.email.toLowerCase()) ??
    users.find((u) => u.name === session.name) ??
    users.find((u) => u.role === "Founder" && u.status === "Active") ??
    null
  );
};

const nowStamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emailName = (email: string) => {
  const local = email.split("@")[0] ?? "Member";
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
};

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

/** Pure helpers exported for unit tests (no React). */
export function validateInvite(
  email: string,
  role: AppUser["role"],
  users: AppUser[],
): { ok: true; email: string } | { ok: false; error: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
    return { ok: false, error: "Enter a valid email address." };
  if (!role) return { ok: false, error: "Role is required." };
  const existing = users.find((u) => u.email.toLowerCase() === trimmed);
  if (existing?.status === "Invited") {
    return { ok: false, error: "An invitation is already pending for this email." };
  }
  if (existing) {
    return { ok: false, error: "This email already belongs to a workspace member." };
  }
  return { ok: true, email: trimmed };
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
  const [workspaceUsers, setWorkspaceUsers] = useState<AppUser[]>(() => [...seedUsers]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => [...seedAudit]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() =>
    defaultCompanySettings(),
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => [...seedDocuments]);
  const [payments, setPayments] = useState<Payment[]>(() => [...seedPayments]);
  const [registrations, setRegistrations] = useState<Registration[]>(() => [...seedRegistrations]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    ...seedNotifications,
  ]);

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
      if (parsed.workspaceUsers?.length) setWorkspaceUsers(parsed.workspaceUsers);
      if (parsed.auditEntries?.length) setAuditEntries(parsed.auditEntries);
      if (parsed.companySettings)
        setCompanySettings({ ...defaultCompanySettings(), ...parsed.companySettings });
      if (parsed.documents) setDocuments(parsed.documents);
      if (parsed.payments) setPayments(parsed.payments);
      if (parsed.registrations) setRegistrations(parsed.registrations);
      if (parsed.notifications) setNotifications(parsed.notifications);
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
      workspaceUsers: AppUser[];
      auditEntries: AuditEntry[];
      companySettings: CompanySettings;
      documents: DocumentRecord[];
      payments: Payment[];
      registrations: Registration[];
      notifications: NotificationItem[];
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
          workspaceUsers: next.workspaceUsers,
          auditEntries: next.auditEntries,
          companySettings: next.companySettings,
          documents: next.documents,
          payments: next.payments,
          registrations: next.registrations,
          notifications: next.notifications,
        };
        localStorage.setItem(KEY, JSON.stringify(payload));
      } catch {
        /* quota / private mode */
      }
    },
    [],
  );

  type SnapshotPatch = Partial<{
    projects: Project[];
    customers: Customer[];
    agents: Agent[];
    extraPlots: Plot[];
    extraBookings: Booking[];
    extraReservations: Reservation[];
    extraVisits: SiteVisit[];
    workspaceUsers: AppUser[];
    auditEntries: AuditEntry[];
    companySettings: CompanySettings;
    documents: DocumentRecord[];
    payments: Payment[];
    registrations: Registration[];
    notifications: NotificationItem[];
  }>;

  const snapshot = useCallback(
    (patch: SnapshotPatch) => {
      const next = {
        projects: patch.projects ?? core.projects,
        customers: patch.customers ?? core.customers,
        agents: patch.agents ?? core.agents,
        extraPlots: patch.extraPlots ?? extraPlots,
        extraBookings: patch.extraBookings ?? extraBookings,
        extraReservations: patch.extraReservations ?? extraReservations,
        extraVisits: patch.extraVisits ?? extraVisits,
        workspaceUsers: patch.workspaceUsers ?? workspaceUsers,
        auditEntries: patch.auditEntries ?? auditEntries,
        companySettings: patch.companySettings ?? companySettings,
        documents: patch.documents ?? documents,
        payments: patch.payments ?? payments,
        registrations: patch.registrations ?? registrations,
        notifications: patch.notifications ?? notifications,
      };
      persist(next);
    },
    [
      core,
      extraPlots,
      extraBookings,
      extraReservations,
      extraVisits,
      workspaceUsers,
      auditEntries,
      companySettings,
      documents,
      payments,
      registrations,
      notifications,
      persist,
    ],
  );

  const appendAudit = useCallback(
    (entry: LogAuditInput, users: AppUser[], prevEntries: AuditEntry[]) => {
      const actor =
        entry.actor ?? resolveCurrentUser(users)?.name ?? getSession()?.name ?? "System";
      const id = `AUD-${String(9000 + prevEntries.length + Math.floor(Math.random() * 1000))}`;
      const next: AuditEntry = {
        id,
        time: entry.timestamp ?? nowStamp(),
        actor,
        action: entry.action,
        object: entry.object,
        before: entry.before ?? "—",
        after: entry.after ?? "—",
      };
      return [next, ...prevEntries];
    },
    [],
  );

  const logAudit = useCallback(
    (entry: LogAuditInput) => {
      setAuditEntries((prev) => {
        const next = appendAudit(entry, workspaceUsers, prev);
        snapshot({ auditEntries: next });
        return next;
      });
    },
    [appendAudit, snapshot, workspaceUsers],
  );

  const upsertCore = useCallback(
    <K extends "projects" | "customers" | "agents">(
      key: K,
      item: Data[K][number],
      audit?: LogAuditInput,
    ) => {
      setCore((prev) => {
        const list = prev[key] as { id: string }[];
        const exists = list.some((x) => x.id === item.id);
        const nextList = exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
        const next = { ...prev, [key]: nextList };
        if (audit) {
          setAuditEntries((ae) => {
            const entries = appendAudit(audit, workspaceUsers, ae);
            snapshot({ [key]: nextList, auditEntries: entries } as never);
            return entries;
          });
        } else {
          snapshot({ [key]: nextList } as never);
        }
        return next;
      });
    },
    [appendAudit, snapshot, workspaceUsers],
  );

  const removeCore = useCallback(
    (key: "projects" | "customers" | "agents", id: string, audit?: LogAuditInput) => {
      setCore((prev) => {
        const next = {
          ...prev,
          [key]: (prev[key] as { id: string }[]).filter((x) => x.id !== id),
        };
        if (audit) {
          setAuditEntries((ae) => {
            const entries = appendAudit(audit, workspaceUsers, ae);
            snapshot({ [key]: next[key], auditEntries: entries } as never);
            return entries;
          });
        } else {
          snapshot({ [key]: next[key] } as never);
        }
        return next;
      });
    },
    [appendAudit, snapshot, workspaceUsers],
  );

  const upsertExtra = useCallback(<T extends { id: string }>(list: T[], item: T) => {
    const exists = list.some((x) => x.id === item.id);
    return exists ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];
  }, []);

  const hardReset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
      // Also clear legacy keys
      localStorage.removeItem("bhairava.admin.v3");
    } catch {
      /* ignore */
    }
    setCore({ projects: seedProjects, customers: seedCustomers, agents: seedAgents });
    setExtraPlots([]);
    setExtraBookings([]);
    setExtraReservations([]);
    setExtraVisits([]);
    setWorkspaceUsers([...seedUsers]);
    setAuditEntries([...seedAudit]);
    setCompanySettings(defaultCompanySettings());
    setDocuments([...seedDocuments]);
    setPayments([...seedPayments]);
    setRegistrations([...seedRegistrations]);
    setNotifications([...seedNotifications]);
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
      workspaceUsers,
      auditEntries,
      companySettings,
      documents,
      payments,
      registrations,
      notifications,
      currentUser: resolveCurrentUser(workspaceUsers),

      saveProject: (p) => {
        const exists = core.projects.some((x) => x.id === p.id);
        upsertCore("projects", p, {
          action: exists ? "edited project" : "created project",
          object: p.id,
          before: exists ? "previous" : "—",
          after: p.status,
        });
      },
      removeProject: (id) =>
        removeCore("projects", id, {
          action: "deleted project",
          object: id,
          before: "exists",
          after: "deleted",
        }),
      saveCustomer: (c) => {
        const exists = core.customers.some((x) => x.id === c.id);
        upsertCore("customers", c, {
          action: exists ? "edited customer" : "created customer",
          object: c.id,
          before: exists ? "previous" : "—",
          after: c.stage,
        });
      },
      removeCustomer: (id) =>
        removeCore("customers", id, {
          action: "deleted customer",
          object: id,
          before: "exists",
          after: "deleted",
        }),
      saveAgent: (a) => {
        const exists = core.agents.some((x) => x.id === a.id);
        upsertCore("agents", a, {
          action: exists ? "edited agent" : "created agent",
          object: a.id,
          before: exists ? "previous" : "—",
          after: a.status ?? "Active",
        });
      },
      removeAgent: (id) =>
        removeCore("agents", id, {
          action: "deleted agent",
          object: id,
          before: "exists",
          after: "deleted",
        }),
      savePlot: (p) => {
        setExtraPlots((prev) => {
          const exists = mergeById(seedPlots, prev).some((x) => x.id === p.id);
          const next = upsertExtra(prev, p);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "edited plot" : "created plot",
                object: p.id,
                before: exists ? "previous" : "—",
                after: p.status,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ extraPlots: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removePlot: (id) => {
        setExtraPlots((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "deleted plot", object: id, before: "exists", after: "deleted" },
              workspaceUsers,
              ae,
            );
            snapshot({ extraPlots: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      saveBooking: (b) => {
        setExtraBookings((prev) => {
          const exists = mergeById(seedBookings, prev).some((x) => x.id === b.id);
          const next = upsertExtra(prev, b);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "updated booking stage" : "created booking",
                object: b.id,
                before: exists ? "previous" : "—",
                after: b.stage,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ extraBookings: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removeBooking: (id) => {
        setExtraBookings((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "cancelled booking", object: id, before: "exists", after: "cancelled" },
              workspaceUsers,
              ae,
            );
            snapshot({ extraBookings: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      saveReservation: (r) => {
        setExtraReservations((prev) => {
          const exists = mergeById(seedReservations, prev).some((x) => x.id === r.id);
          const next = upsertExtra(prev, r);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "updated reservation" : "created reservation",
                object: r.id,
                before: exists ? "previous" : "—",
                after: r.state,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ extraReservations: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removeReservation: (id) => {
        setExtraReservations((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "cancelled reservation", object: id, before: "exists", after: "cancelled" },
              workspaceUsers,
              ae,
            );
            snapshot({ extraReservations: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      saveVisit: (v) => {
        setExtraVisits((prev) => {
          const exists = mergeById(seedSiteVisits, prev).some((x) => x.id === v.id);
          const next = upsertExtra(prev, v);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "updated site visit" : "created site visit",
                object: v.id,
                before: exists ? "previous" : "—",
                after: v.status,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ extraVisits: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      saveSiteVisit: (v) => {
        setExtraVisits((prev) => {
          const exists = mergeById(seedSiteVisits, prev).some((x) => x.id === v.id);
          const next = upsertExtra(prev, v);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "updated site visit" : "created site visit",
                object: v.id,
                before: exists ? "previous" : "—",
                after: v.status,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ extraVisits: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removeSiteVisit: (id) => {
        setExtraVisits((prev) => {
          const next = prev.filter((x) => x.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "cancelled site visit", object: id, before: "exists", after: "cancelled" },
              workspaceUsers,
              ae,
            );
            snapshot({ extraVisits: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },

      saveUser: (u) => {
        setWorkspaceUsers((prev) => {
          const next = upsertExtra(prev, u);
          snapshot({ workspaceUsers: next });
          return next;
        });
      },

      updateUserRole: (id, role) => {
        const actor = resolveCurrentUser(workspaceUsers);
        const target = workspaceUsers.find((u) => u.id === id);
        if (!target) return { ok: false, error: "Member not found." };
        const check = canDemoteFounder(actor, target, role, workspaceUsers);
        if (!check.ok) return { ok: false, error: check.reason ?? "Not allowed." };
        if (target.role === role) return { ok: true };

        setWorkspaceUsers((prev) => {
          const next = prev.map((u) => (u.id === id ? { ...u, role } : u));
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: "changed member role",
                object: id,
                before: target.role,
                after: role,
              },
              prev,
              ae,
            );
            snapshot({ workspaceUsers: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
        return { ok: true };
      },

      updateUserStatus: (id, status) => {
        const actor = resolveCurrentUser(workspaceUsers);
        const target = workspaceUsers.find((u) => u.id === id);
        if (!target) return { ok: false, error: "Member not found." };
        if (actor?.id === id && status === "Suspended") {
          return { ok: false, error: "You cannot suspend yourself." };
        }
        if (target.role === "Founder" && status === "Suspended") {
          const founders = workspaceUsers.filter(
            (u) => u.role === "Founder" && u.status === "Active",
          );
          if (founders.length <= 1) {
            return { ok: false, error: "Cannot suspend the final Founder." };
          }
        }
        const roleGate = canChangeRole(actor, target, target.role);
        if (!roleGate.ok) return { ok: false, error: roleGate.reason ?? "Not allowed." };

        const action =
          status === "Suspended"
            ? "suspended member"
            : status === "Active" && target.status === "Suspended"
              ? "reactivated member"
              : "updated member status";

        setWorkspaceUsers((prev) => {
          const next = prev.map((u) => (u.id === id ? { ...u, status } : u));
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action, object: id, before: target.status, after: status },
              prev,
              ae,
            );
            snapshot({ workspaceUsers: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
        return { ok: true };
      },

      removeUser: (id) => {
        const actor = resolveCurrentUser(workspaceUsers);
        const target = workspaceUsers.find((u) => u.id === id);
        if (!target) return { ok: false, error: "Member not found." };
        const check = canRemoveMember(actor, target, workspaceUsers);
        if (!check.ok) return { ok: false, error: check.reason ?? "Not allowed." };

        setWorkspaceUsers((prev) => {
          const next = prev.filter((u) => u.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: target.status === "Invited" ? "revoked invitation" : "removed member",
                object: id,
                before: target.status,
                after: "removed",
              },
              prev,
              ae,
            );
            snapshot({ workspaceUsers: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
        return { ok: true };
      },

      inviteUser: (email, role) => {
        const actor = resolveCurrentUser(workspaceUsers);
        if (!actor || (actor.role !== "Founder" && actor.role !== "Administrator")) {
          return { ok: false, error: "You do not have permission to invite members." };
        }
        if (actor.role === "Administrator" && (role === "Founder" || role === "Administrator")) {
          return { ok: false, error: "Administrators cannot invite Founders or Administrators." };
        }
        const valid = validateInvite(email, role, workspaceUsers);
        if (!valid.ok) return { ok: false, error: valid.error ?? "Not allowed." };

        let max = 0;
        for (const u of workspaceUsers) {
          const m = /^USR-(\d+)$/.exec(u.id);
          if (m?.[1]) max = Math.max(max, Number(m[1]));
        }
        const user: AppUser = {
          id: `USR-${String(max + 1).padStart(2, "0")}`,
          name: emailName(valid.email),
          email: valid.email,
          role,
          status: "Invited",
          lastActive: "—",
        };

        setWorkspaceUsers((prev) => {
          const next = [user, ...prev];
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "invited user", object: user.id, before: "—", after: role },
              prev,
              ae,
            );
            snapshot({ workspaceUsers: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
        return { ok: true, user };
      },

      resendInvitation: (id) => {
        const target = workspaceUsers.find((u) => u.id === id);
        if (!target || target.status !== "Invited") {
          return { ok: false, error: "No pending invitation for this member." };
        }
        setAuditEntries((ae) => {
          const entries = appendAudit(
            { action: "resent invitation", object: id, before: "Invited", after: "Invited" },
            workspaceUsers,
            ae,
          );
          snapshot({ auditEntries: entries });
          return entries;
        });
        return { ok: true };
      },

      revokeInvitation: (id) => {
        const actor = resolveCurrentUser(workspaceUsers);
        const target = workspaceUsers.find((u) => u.id === id);
        if (!target || target.status !== "Invited") {
          return { ok: false, error: "No pending invitation for this member." };
        }
        const check = canRemoveMember(actor, target, workspaceUsers);
        if (!check.ok) return { ok: false, error: check.reason ?? "Not allowed." };
        setWorkspaceUsers((prev) => {
          const next = prev.filter((u) => u.id !== id);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              { action: "revoked invitation", object: id, before: "Invited", after: "removed" },
              prev,
              ae,
            );
            snapshot({ workspaceUsers: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
        return { ok: true };
      },

      logAudit,

      saveCompanySettings: (s) => {
        setCompanySettings(s);
        setAuditEntries((ae) => {
          const entries = appendAudit(
            {
              action: "changed company settings",
              object: "company",
              before: companySettings.companyName,
              after: s.companyName,
            },
            workspaceUsers,
            ae,
          );
          snapshot({ companySettings: s, auditEntries: entries });
          return entries;
        });
      },

      saveDocument: (d) => {
        setDocuments((prev) => {
          const exists = prev.some((x) => x.id === d.id);
          const next = upsertExtra(prev, d);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists
                  ? d.verified === "Verified"
                    ? "verified document"
                    : d.verified === "Rejected"
                      ? "rejected document"
                      : "updated document"
                  : "uploaded document",
                object: d.id,
                before: exists ? "previous" : "—",
                after: d.verified,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ documents: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removeDocument: (id) => {
        setDocuments((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ documents: next });
          return next;
        });
      },

      savePayment: (p) => {
        setPayments((prev) => {
          const exists = prev.some((x) => x.id === p.id);
          const next = upsertExtra(prev, p);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action:
                  p.status === "Refunded"
                    ? "refunded payment"
                    : p.status === "Failed"
                      ? "failed payment"
                      : exists
                        ? "updated payment"
                        : "created payment",
                object: p.id,
                before: exists ? "previous" : "—",
                after: p.status,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ payments: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removePayment: (id) => {
        setPayments((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ payments: next });
          return next;
        });
      },

      saveRegistration: (r) => {
        setRegistrations((prev) => {
          const exists = prev.some((x) => x.id === r.id);
          const next = upsertExtra(prev, r);
          setAuditEntries((ae) => {
            const entries = appendAudit(
              {
                action: exists ? "updated registration" : "created registration",
                object: r.id,
                before: exists ? "previous" : "—",
                after: r.stage,
              },
              workspaceUsers,
              ae,
            );
            snapshot({ registrations: next, auditEntries: entries });
            return entries;
          });
          return next;
        });
      },
      removeRegistration: (id) => {
        setRegistrations((prev) => {
          const next = prev.filter((x) => x.id !== id);
          snapshot({ registrations: next });
          return next;
        });
      },

      saveNotification: (n) => {
        setNotifications((prev) => {
          const next = upsertExtra(prev, n);
          snapshot({ notifications: next });
          return next;
        });
      },
      markAllNotificationsRead: () => {
        setNotifications((prev) => {
          const next = prev.map((n) => ({ ...n, unread: false }));
          snapshot({ notifications: next });
          return next;
        });
      },
      markNotificationRead: (id) => {
        setNotifications((prev) => {
          const next = prev.map((n) => (n.id === id ? { ...n, unread: false } : n));
          snapshot({ notifications: next });
          return next;
        });
      },

      reset: hardReset,
      deleteWorkspace: () => {
        hardReset();
        setAuditEntries((ae) => {
          const entries = appendAudit(
            {
              action: "deleted workspace",
              object: "workspace",
              before: "active",
              after: "reset",
            },
            workspaceUsers,
            ae,
          );
          // Persist the reset seed + this audit note
          try {
            const payload: Persisted = {
              projects: seedProjects,
              customers: seedCustomers,
              agents: seedAgents,
              extraPlots: [],
              extraBookings: [],
              extraReservations: [],
              extraVisits: [],
              workspaceUsers: seedUsers,
              auditEntries: entries,
              companySettings: defaultCompanySettings(),
              documents: seedDocuments,
              payments: seedPayments,
              registrations: seedRegistrations,
              notifications: seedNotifications,
            };
            localStorage.setItem(KEY, JSON.stringify(payload));
          } catch {
            /* ignore */
          }
          return entries;
        });
        setWorkspaceUsers([...seedUsers]);
        setCompanySettings(defaultCompanySettings());
        setDocuments([...seedDocuments]);
        setPayments([...seedPayments]);
        setRegistrations([...seedRegistrations]);
        setNotifications([...seedNotifications]);
        setCore({ projects: seedProjects, customers: seedCustomers, agents: seedAgents });
        setExtraPlots([]);
        setExtraBookings([]);
        setExtraReservations([]);
        setExtraVisits([]);
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
      workspaceUsers,
      auditEntries,
      companySettings,
      documents,
      payments,
      registrations,
      notifications,
      upsertCore,
      removeCore,
      upsertExtra,
      snapshot,
      appendAudit,
      logAudit,
      hardReset,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
