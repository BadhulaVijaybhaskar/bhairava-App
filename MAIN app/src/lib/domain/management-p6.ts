/**
 * P6 completion — member lifecycle, permission matrix, company v2 fields,
 * archive/restore. Complements ./management.ts (existing APIs preserved).
 */
import { normalizeRole, type AppRole } from "./project-permissions";
import {
  appendAuditEvent,
  canAccessDangerZone,
  canMutateManagement,
  DEFAULT_COMPANY_SETTINGS,
  DEFAULT_NOTIFICATION_PREFS,
  mergeNotificationPrefs,
  normalizeCompanySettings,
  type AuditEvent,
  type CompanySettings,
  type ManagedMember,
  type NotificationPreference,
} from "./management";

export const MAIN_MEMBER_ROLES = ["Founder", "Administrator", "Finance", "Viewer"] as const;
export type MainMemberRole = (typeof MAIN_MEMBER_ROLES)[number];

export function isMainMemberRole(role: unknown): role is MainMemberRole {
  return (MAIN_MEMBER_ROLES as readonly string[]).includes(normalizeRole(role));
}

export type MemberStatusV2 = "invited" | "active" | "suspended" | "revoked";

export function legacyStatusToV2(raw: unknown): MemberStatusV2 {
  const s = String(raw ?? "");
  if (s === "Invited" || s === "invited") return "invited";
  if (s === "Suspended" || s === "suspended") return "suspended";
  if (s === "revoked" || s === "Revoked") return "revoked";
  return "active";
}

export function v2StatusToLegacy(s: MemberStatusV2): ManagedMember["status"] {
  if (s === "invited") return "Invited";
  if (s === "suspended" || s === "revoked") return "Suspended";
  return "Active";
}

export function memberStatusLabel(s: MemberStatusV2): string {
  if (s === "invited") return "Invited";
  if (s === "suspended") return "Suspended";
  if (s === "revoked") return "Revoked";
  return "Active";
}

/** Extended member row used by P6 Members UI (persisted). */
export interface ManagedMemberP6 extends ManagedMember {
  statusV2: MemberStatusV2;
  lastLogin: string | null;
  joinedAt: string | null;
  invitedBy: string | null;
}

export function toManagedMemberP6(
  raw: Partial<ManagedMemberP6> & { id: string; email: string },
): ManagedMemberP6 {
  const statusV2 = raw.statusV2 ?? legacyStatusToV2(raw.status);
  const baseStatus = v2StatusToLegacy(statusV2);
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.email.split("@")[0] || "Member",
    email: raw.email.trim().toLowerCase(),
    role: normalizeRole(raw.role),
    status: baseStatus,
    lastActive: raw.lastActive || raw.lastLogin || "—",
    ...(raw.invitedAt ? { invitedAt: raw.invitedAt } : {}),
    statusV2,
    lastLogin: raw.lastLogin ?? (raw.lastActive && raw.lastActive !== "—" ? raw.lastActive : null),
    joinedAt: raw.joinedAt ?? (statusV2 === "active" ? raw.invitedAt ?? null : null),
    invitedBy: raw.invitedBy ?? null,
  };
}

export function membersFromLegacy(list: ManagedMember[]): ManagedMemberP6[] {
  return list.map((m) =>
    toManagedMemberP6({
      ...m,
      statusV2: legacyStatusToV2(m.status),
      lastLogin: m.lastActive !== "—" ? m.lastActive : null,
      joinedAt: m.status === "Active" ? m.invitedAt ?? "2026-01-01" : null,
      invitedBy: null,
    }),
  );
}

export function inviteMemberP6(
  list: ManagedMemberP6[],
  input: { email: string; role: AppRole; name?: string; actorEmail: string },
): { ok: true; member: ManagedMemberP6; list: ManagedMemberP6[] } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Valid email required." };
  if (list.some((m) => m.email === email && m.statusV2 !== "revoked")) {
    return { ok: false, error: "Member already exists." };
  }
  if (input.role === "Customer" || input.role === "Agent") {
    return { ok: false, error: "Agent/Customer seats live in their own apps — use MAIN roles only." };
  }
  let role = normalizeRole(input.role);
  if (role === "Sales") role = "Viewer";
  if (!isMainMemberRole(role)) {
    return { ok: false, error: "Assign Founder, Administrator, Finance, or Viewer." };
  }
  const member = toManagedMemberP6({
    id: `USR-${Date.now()}`,
    email,
    name: (input.name?.trim() || email.split("@")[0] || "Member"),
    role,
    statusV2: "invited",
    status: "Invited",
    lastActive: "—",
    lastLogin: null,
    joinedAt: null,
    invitedAt: new Date().toISOString().slice(0, 10),
    invitedBy: input.actorEmail,
  });
  return { ok: true, member, list: [member, ...list.filter((m) => m.email !== email)] };
}

export function updateMemberRoleP6(
  list: ManagedMemberP6[],
  memberId: string,
  role: AppRole,
  actorRole: unknown,
): { ok: true; list: ManagedMemberP6[] } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  let nextRole = normalizeRole(role);
  if (nextRole === "Sales") nextRole = "Viewer";
  if (nextRole === "Customer" || nextRole === "Agent") {
    return { ok: false, error: "Agent/Customer are not MAIN member roles." };
  }
  if (!isMainMemberRole(nextRole)) return { ok: false, error: "Invalid MAIN role." };
  if (nextRole === "Founder" && normalizeRole(actorRole) !== "Founder") {
    return { ok: false, error: "Only Founder can grant Founder." };
  }
  if (list[idx]!.role === "Founder" && nextRole !== "Founder" && normalizeRole(actorRole) !== "Founder") {
    return { ok: false, error: "Only Founder can change Founder role." };
  }
  const next = list.slice();
  next[idx] = { ...next[idx]!, role: nextRole };
  return { ok: true, list: next };
}

export function suspendMemberP6(
  list: ManagedMemberP6[],
  memberId: string,
): { ok: true; list: ManagedMemberP6[] } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  if (list[idx]!.role === "Founder") return { ok: false, error: "Cannot suspend Founder." };
  const next = list.slice();
  next[idx] = toManagedMemberP6({ ...next[idx]!, statusV2: "suspended", status: "Suspended" });
  return { ok: true, list: next };
}

export function reactivateMemberP6(
  list: ManagedMemberP6[],
  memberId: string,
): { ok: true; list: ManagedMemberP6[] } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  if (list[idx]!.statusV2 === "revoked") {
    return { ok: false, error: "Revoked members cannot be reactivated — re-invite." };
  }
  const next = list.slice();
  next[idx] = toManagedMemberP6({
    ...next[idx]!,
    statusV2: "active",
    status: "Active",
    joinedAt: next[idx]!.joinedAt ?? new Date().toISOString().slice(0, 10),
  });
  return { ok: true, list: next };
}

export function revokeMemberP6(
  list: ManagedMemberP6[],
  memberId: string,
): { ok: true; list: ManagedMemberP6[] } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  if (list[idx]!.role === "Founder") return { ok: false, error: "Cannot revoke Founder." };
  const next = list.slice();
  next[idx] = toManagedMemberP6({ ...next[idx]!, statusV2: "revoked", status: "Suspended" });
  return { ok: true, list: next };
}

export function resendInviteP6(
  list: ManagedMemberP6[],
  memberId: string,
): { ok: true; list: ManagedMemberP6[]; invitedAt: string } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  if (list[idx]!.statusV2 !== "invited") return { ok: false, error: "Member is not invited." };
  const invitedAt = new Date().toISOString().slice(0, 10);
  const next = list.slice();
  next[idx] = { ...next[idx]!, invitedAt };
  return { ok: true, list: next, invitedAt };
}

export type MatrixModule =
  | "Projects"
  | "Plots"
  | "Sales"
  | "Finance"
  | "Operations"
  | "Reports"
  | "Members"
  | "Company"
  | "Billing"
  | "Danger Zone";

export type MatrixCell = "full" | "read" | "none" | "founder";

export const MATRIX_MODULES: MatrixModule[] = [
  "Projects",
  "Plots",
  "Sales",
  "Finance",
  "Operations",
  "Reports",
  "Members",
  "Company",
  "Billing",
  "Danger Zone",
];

export const PERMISSION_MATRIX: Record<MainMemberRole, Record<MatrixModule, MatrixCell>> = {
  Founder: {
    Projects: "full",
    Plots: "full",
    Sales: "full",
    Finance: "full",
    Operations: "full",
    Reports: "full",
    Members: "full",
    Company: "full",
    Billing: "founder",
    "Danger Zone": "founder",
  },
  Administrator: {
    Projects: "full",
    Plots: "full",
    Sales: "full",
    Finance: "full",
    Operations: "full",
    Reports: "full",
    Members: "full",
    Company: "full",
    Billing: "none",
    "Danger Zone": "none",
  },
  Finance: {
    Projects: "read",
    Plots: "read",
    Sales: "read",
    Finance: "full",
    Operations: "read",
    Reports: "full",
    Members: "none",
    Company: "read",
    Billing: "none",
    "Danger Zone": "none",
  },
  Viewer: {
    Projects: "read",
    Plots: "read",
    Sales: "read",
    Finance: "read",
    Operations: "read",
    Reports: "read",
    Members: "none",
    Company: "read",
    Billing: "none",
    "Danger Zone": "none",
  },
};

export function matrixCellLabel(cell: MatrixCell): string {
  if (cell === "full") return "Full";
  if (cell === "read") return "View";
  if (cell === "founder") return "Founder only";
  return "—";
}

export interface CompanySettingsP6 extends CompanySettings {
  logoRef: string;
  rera: string;
  receiptPrefix: string;
  receiptFooter: string;
  defaultReservationDays: number;
  notificationPrefs: NotificationPreference[];
}

export const DEFAULT_COMPANY_SETTINGS_P6: CompanySettingsP6 = {
  ...DEFAULT_COMPANY_SETTINGS,
  logoRef: "",
  rera: "",
  receiptPrefix: "BHR",
  receiptFooter: "Thank you for choosing Bhairava.",
  defaultReservationDays: 7,
  notificationPrefs: [...DEFAULT_NOTIFICATION_PREFS],
};

export function normalizeCompanySettingsP6(
  raw: Partial<CompanySettingsP6> | null | undefined,
): CompanySettingsP6 {
  const base = { ...DEFAULT_COMPANY_SETTINGS_P6 };
  if (!raw || typeof raw !== "object") return base;
  const n = normalizeCompanySettings(raw);
  return {
    ...base,
    ...n,
    logoRef: typeof raw.logoRef === "string" ? raw.logoRef : base.logoRef,
    rera: typeof raw.rera === "string" ? raw.rera : base.rera,
    receiptPrefix: typeof raw.receiptPrefix === "string" ? raw.receiptPrefix : base.receiptPrefix,
    receiptFooter: typeof raw.receiptFooter === "string" ? raw.receiptFooter : base.receiptFooter,
    defaultReservationDays:
      typeof raw.defaultReservationDays === "number" && raw.defaultReservationDays > 0
        ? Math.min(90, Math.floor(raw.defaultReservationDays))
        : base.defaultReservationDays,
    notificationPrefs: mergeNotificationPrefs(base.notificationPrefs, raw.notificationPrefs ?? []),
  };
}

export interface InAppNotification {
  id: string;
  kind:
    | "reservation_expiring"
    | "payment_due"
    | "payment_overdue"
    | "document_pending"
    | "registration_scheduled"
    | "registration_completed"
    | "booking_created"
    | "cancellation_request"
    | "resale_created";
  title: string;
  detail: string;
  entityType: string;
  entityId: string;
  href: string;
  createdAt: string;
  unread: boolean;
}

export interface ArchiveRecord {
  id: string;
  entityType: "project";
  entityId: string;
  entityLabel: string;
  archivedAt: string;
  archivedBy: string;
  reason: string;
  restoredAt?: string;
}

export function archiveProjectRecord(
  archives: ArchiveRecord[],
  input: { entityId: string; entityLabel: string; actorEmail: string; reason: string },
):
  | { ok: true; archives: ArchiveRecord[]; event: Omit<import("./management").AuditEvent, "id" | "at"> }
  | { ok: false; error: string } {
  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Reason required (min 3 chars)." };
  if (archives.some((a) => a.entityId === input.entityId && !a.restoredAt)) {
    return { ok: false, error: "Already archived." };
  }
  const row: ArchiveRecord = {
    id: `ARC-${Date.now()}`,
    entityType: "project",
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    archivedAt: new Date().toISOString(),
    archivedBy: input.actorEmail,
    reason,
  };
  return {
    ok: true,
    archives: [row, ...archives],
    event: {
      actorId: input.actorEmail,
      actorEmail: input.actorEmail,
      action: "project.archive",
      entityType: "project",
      entityId: input.entityId,
      summary: `Archived ${input.entityLabel}: ${reason}`,
      before: "active",
      after: "archived",
    },
  };
}

export function restoreProjectRecord(
  archives: ArchiveRecord[],
  archiveId: string,
  actorEmail: string,
):
  | { ok: true; archives: ArchiveRecord[]; event: Omit<import("./management").AuditEvent, "id" | "at"> }
  | { ok: false; error: string } {
  const idx = archives.findIndex((a) => a.id === archiveId);
  if (idx < 0) return { ok: false, error: "Archive record not found." };
  if (archives[idx]!.restoredAt) return { ok: false, error: "Already restored." };
  const next = archives.slice();
  next[idx] = { ...next[idx]!, restoredAt: new Date().toISOString() };
  const a = next[idx]!;
  return {
    ok: true,
    archives: next,
    event: {
      actorId: actorEmail,
      actorEmail,
      action: "project.restore",
      entityType: "project",
      entityId: a.entityId,
      summary: `Restored ${a.entityLabel}`,
      before: "archived",
      after: "active",
    },
  };
}

export { appendAuditEvent, canAccessDangerZone, canMutateManagement, normalizeRole };
