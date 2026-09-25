/**
 * P6 management persistence — members, company, audit, billing, archives, notification reads.
 * Separate localStorage key so P3–P5 operational store is never wiped by management work.
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
import { appUsers } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import {
  appendAuditEvent,
  buildManagementDemoSeed,
  canMutateManagement,
  filterAuditEvents,
  mergeManagementSeed,
  normalizeFounderBilling,
  type AuditEvent,
  type FounderBillingSurface,
} from "@/lib/domain/management";
import {
  archiveProjectRecord,
  inviteMemberP6,
  membersFromLegacy,
  normalizeCompanySettingsP6,
  reactivateMemberP6,
  resendInviteP6,
  restoreProjectRecord,
  revokeMemberP6,
  suspendMemberP6,
  toManagedMemberP6,
  updateMemberRoleP6,
  type ArchiveRecord,
  type CompanySettingsP6,
  type ManagedMemberP6,
} from "@/lib/domain/management-p6";
import type { AppRole } from "@/lib/domain/project-permissions";

const KEY = "bhairava.management.v1";

interface Persisted {
  schemaVersion: number;
  members: ManagedMemberP6[];
  company: CompanySettingsP6;
  auditEvents: AuditEvent[];
  billing: FounderBillingSurface;
  archives: ArchiveRecord[];
  notificationReadIds: string[];
}

export interface ManagementApi {
  members: ManagedMemberP6[];
  company: CompanySettingsP6;
  auditEvents: AuditEvent[];
  billing: FounderBillingSurface;
  archives: ArchiveRecord[];
  notificationReadIds: string[];
  canMutate: boolean;
  invite: (input: { email: string; role: AppRole; name?: string }) => { ok: true } | { ok: false; error: string };
  setRole: (memberId: string, role: AppRole) => { ok: true } | { ok: false; error: string };
  suspend: (memberId: string) => { ok: true } | { ok: false; error: string };
  reactivate: (memberId: string) => { ok: true } | { ok: false; error: string };
  revoke: (memberId: string) => { ok: true } | { ok: false; error: string };
  resend: (memberId: string) => { ok: true } | { ok: false; error: string };
  saveCompany: (patch: Partial<CompanySettingsP6>) => { ok: true } | { ok: false; error: string };
  saveBilling: (patch: Partial<FounderBillingSurface>) => { ok: true } | { ok: false; error: string };
  archiveProject: (input: {
    entityId: string;
    entityLabel: string;
    reason: string;
  }) => { ok: true } | { ok: false; error: string };
  restoreProject: (archiveId: string) => { ok: true } | { ok: false; error: string };
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (ids: string[]) => void;
  filterAudit: (opts: { actor?: string; action?: string; from?: string; to?: string }) => AuditEvent[];
  recordAudit: (event: Omit<AuditEvent, "id" | "at"> & { at?: string; id?: string }) => void;
  resetManagement: () => void;
}

const Ctx = createContext<ManagementApi | null>(null);

function buildSeed(): Persisted {
  const seed = buildManagementDemoSeed({
    appUsers: appUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      lastActive: u.lastActive,
    })),
    auditLog: [],
  });
  let members = membersFromLegacy(seed.members);
  if (!members.some((m) => m.email === "admin@bhairava.com")) {
    members = [
      toManagedMemberP6({
        id: "USR-ADMIN",
        name: "Vijay Bhaskar",
        email: "admin@bhairava.com",
        role: "Administrator",
        statusV2: "active",
        status: "Active",
        lastActive: "2026-09-24",
        lastLogin: "2026-09-24",
        joinedAt: "2026-01-01",
        invitedBy: "system@seed",
      }),
      ...members,
    ];
  }
  return {
    schemaVersion: 1,
    members,
    company: normalizeCompanySettingsP6(seed.company),
    auditEvents: [],
    billing: normalizeFounderBilling(seed.billing),
    archives: [],
    notificationReadIds: [],
  };
}

function load(): Persisted {
  const seeded = buildSeed();
  if (typeof window === "undefined") return seeded;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seeded;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const merged = mergeManagementSeed({
        company: parsed.company,
        members: parsed.members,
        auditEvents: parsed.auditEvents,
        billing: parsed.billing,
        notificationPrefs: parsed.company?.notificationPrefs,
      } as never,
      {
        company: seeded.company,
        members: seeded.members,
        notificationPrefs: seeded.company.notificationPrefs,
        auditEvents: [],
        billing: seeded.billing,
      },
    );
    return {
      schemaVersion: 1,
      members: (parsed.members?.length ? parsed.members : membersFromLegacy(merged.members)).map((m) =>
        toManagedMemberP6(m),
      ),
      company: normalizeCompanySettingsP6({ ...merged.company, ...(parsed.company ?? {}) }),
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
      billing: normalizeFounderBilling({ ...merged.billing, ...(parsed.billing ?? {}) }),
      archives: Array.isArray(parsed.archives) ? parsed.archives : [],
      notificationReadIds: Array.isArray(parsed.notificationReadIds) ? parsed.notificationReadIds : [],
    };
  } catch {
    return seeded;
  }
}

export function ManagementProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => buildSeed());

  useEffect(() => {
    setState(load());
  }, []);

  const persist = useCallback((next: Persisted) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const actor = useCallback(() => {
    const s = getSession();
    return {
      email: s?.email || "admin@bhairava.com",
      role: (s?.role || "Administrator") as AppRole,
      id: s?.email || "admin@bhairava.com",
    };
  }, []);

  const recordAudit = useCallback((event: Omit<AuditEvent, "id" | "at"> & { at?: string; id?: string }) => {
    setState((prev) => {
      const next = { ...prev, auditEvents: appendAuditEvent(prev.auditEvents, event) };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<ManagementApi>(() => {
    const a = actor();
    const canMutate = canMutateManagement(a.role);

    const commitMembers = (members: ManagedMemberP6[], event: Omit<AuditEvent, "id" | "at">) => {
      persist({
        ...state,
        members,
        auditEvents: appendAuditEvent(state.auditEvents, { ...event, actorId: a.id, actorEmail: a.email }),
      });
    };

    return {
      members: state.members,
      company: state.company,
      auditEvents: state.auditEvents,
      billing: state.billing,
      archives: state.archives,
      notificationReadIds: state.notificationReadIds,
      canMutate,
      invite: (input) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const res = inviteMemberP6(state.members, { ...input, actorEmail: a.email });
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.invite",
          entityType: "member",
          entityId: res.member.id,
          summary: `Invited ${res.member.email} as ${res.member.role}`,
          after: res.member.role,
        });
        return { ok: true };
      },
      setRole: (memberId, role) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const before = state.members.find((m) => m.id === memberId);
        const res = updateMemberRoleP6(state.members, memberId, role, a.role);
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.role",
          entityType: "member",
          entityId: memberId,
          summary: `Role ${before?.role ?? "?"} → ${role}`,
          ...(before?.role ? { before: before.role } : {}),
          after: role,
        });
        return { ok: true };
      },
      suspend: (memberId) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const res = suspendMemberP6(state.members, memberId);
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.suspend",
          entityType: "member",
          entityId: memberId,
          summary: `Suspended ${memberId}`,
          before: "active",
          after: "suspended",
        });
        return { ok: true };
      },
      reactivate: (memberId) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const res = reactivateMemberP6(state.members, memberId);
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.reactivate",
          entityType: "member",
          entityId: memberId,
          summary: `Reactivated ${memberId}`,
          before: "suspended",
          after: "active",
        });
        return { ok: true };
      },
      revoke: (memberId) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const res = revokeMemberP6(state.members, memberId);
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.revoke",
          entityType: "member",
          entityId: memberId,
          summary: `Revoked ${memberId}`,
          after: "revoked",
        });
        return { ok: true };
      },
      resend: (memberId) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const res = resendInviteP6(state.members, memberId);
        if (!res.ok) return res;
        commitMembers(res.list, {
          actorId: a.id,
          actorEmail: a.email,
          action: "member.resend_invite",
          entityType: "member",
          entityId: memberId,
          summary: `Resent invite ${memberId}`,
          after: res.invitedAt,
        });
        return { ok: true };
      },
      saveCompany: (patch) => {
        if (!canMutate) return { ok: false, error: "Not allowed." };
        const company = normalizeCompanySettingsP6({
          ...state.company,
          ...patch,
          updatedAt: new Date().toISOString(),
          updatedBy: a.email,
        });
        persist({
          ...state,
          company,
          auditEvents: appendAuditEvent(state.auditEvents, {
            actorId: a.id,
            actorEmail: a.email,
            action: "company.update",
            entityType: "company",
            entityId: "company",
            summary: "Updated company settings",
          }),
        });
        return { ok: true };
      },
      saveBilling: (patch) => {
        const billing = normalizeFounderBilling({ ...state.billing, ...patch });
        persist({
          ...state,
          billing,
          auditEvents: appendAuditEvent(state.auditEvents, {
            actorId: a.id,
            actorEmail: a.email,
            action: "billing.update",
            entityType: "billing",
            entityId: "billing",
            summary: "Updated billing metadata",
          }),
        });
        return { ok: true };
      },
      archiveProject: (input) => {
        const res = archiveProjectRecord(state.archives, { ...input, actorEmail: a.email });
        if (!res.ok) return res;
        persist({
          ...state,
          archives: res.archives,
          auditEvents: appendAuditEvent(state.auditEvents, res.event),
        });
        return { ok: true };
      },
      restoreProject: (archiveId) => {
        const res = restoreProjectRecord(state.archives, archiveId, a.email);
        if (!res.ok) return res;
        persist({
          ...state,
          archives: res.archives,
          auditEvents: appendAuditEvent(state.auditEvents, res.event),
        });
        return { ok: true };
      },
      markNotificationRead: (id) => {
        if (state.notificationReadIds.includes(id)) return;
        persist({ ...state, notificationReadIds: [...state.notificationReadIds, id] });
      },
      markAllNotificationsRead: (ids) => {
        persist({
          ...state,
          notificationReadIds: [...new Set([...state.notificationReadIds, ...ids])],
        });
      },
      filterAudit: (opts) => filterAuditEvents(state.auditEvents, opts),
      recordAudit,
      resetManagement: () => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        persist(buildSeed());
      },
    };
  }, [state, actor, persist, recordAudit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useManagement() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useManagement must be used inside <ManagementProvider>");
  return ctx;
}
