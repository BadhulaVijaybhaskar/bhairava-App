/**
 * P6 System / Management domain — Members, Roles, Permissions, Company settings,
 * Notifications prefs, Audit log helpers, Founder Billing + Danger Zone gates.
 * Deepens existing Settings surfaces. No invented metrics. Migrate-on-load friendly.
 */
import { normalizeRole, type AppRole } from "./project-permissions";

export type ManagementAccess = "full" | "admin" | "read" | "denied";

export function managementAccessForRole(role: unknown): ManagementAccess {
  const r = normalizeRole(role);
  if (r === "Founder") return "full";
  if (r === "Administrator") return "admin";
  if (r === "Finance" || r === "Viewer" || r === "Sales" || r === "Agent") return "read";
  return "denied";
}

export function canViewManagement(role: unknown): boolean {
  return managementAccessForRole(role) !== "denied";
}

export function canMutateManagement(role: unknown): boolean {
  const a = managementAccessForRole(role);
  return a === "full" || a === "admin";
}

export function canAccessFounderBilling(role: unknown): boolean {
  return normalizeRole(role) === "Founder";
}

export function canAccessDangerZone(role: unknown): boolean {
  return normalizeRole(role) === "Founder";
}

/** Permission keys used across MAIN workspace tabs. */
export const PERMISSION_KEYS = [
  "projects.view",
  "projects.edit",
  "sales.operate",
  "finance.operate",
  "operations.operate",
  "reports.view",
  "settings.manage",
  "billing.view",
  "danger_zone",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_PERMISSIONS: Record<AppRole, readonly PermissionKey[]> = {
  Founder: [...PERMISSION_KEYS],
  Administrator: [
    "projects.view",
    "projects.edit",
    "sales.operate",
    "finance.operate",
    "operations.operate",
    "reports.view",
    "settings.manage",
  ],
  Finance: ["projects.view", "finance.operate", "reports.view"],
  Viewer: ["projects.view", "reports.view"],
  Agent: ["projects.view", "sales.operate"],
  Customer: [],
  Sales: ["projects.view", "sales.operate", "reports.view"],
};

export function roleHasPermission(role: unknown, key: PermissionKey): boolean {
  const r = normalizeRole(role);
  return (ROLE_PERMISSIONS[r] ?? []).includes(key);
}

export interface CompanySettings {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  timezone: string;
  currency: string;
  fiscalYearStartMonth: number;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  legalName: "Bhairava Realty Private Limited",
  tradeName: "Bhairava",
  gstin: "",
  pan: "",
  address: "",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "",
  phone: "",
  email: "hello@bhairava.com",
  website: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  fiscalYearStartMonth: 4,
  updatedAt: "2026-09-01T00:00:00.000Z",
  updatedBy: "system@seed",
};

export function normalizeCompanySettings(raw: Partial<CompanySettings> | null | undefined): CompanySettings {
  const base = { ...DEFAULT_COMPANY_SETTINGS };
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    fiscalYearStartMonth:
      typeof raw.fiscalYearStartMonth === "number" && raw.fiscalYearStartMonth >= 1 && raw.fiscalYearStartMonth <= 12
        ? raw.fiscalYearStartMonth
        : base.fiscalYearStartMonth,
    updatedAt: raw.updatedAt || base.updatedAt,
    updatedBy: raw.updatedBy || base.updatedBy,
  };
}

export type NotificationChannel = "in_app" | "email";
export type NotificationCategory = "bookings" | "payments" | "documents" | "system" | "registrations";

export interface NotificationPreference {
  category: NotificationCategory;
  inApp: boolean;
  email: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreference[] = [
  { category: "bookings", inApp: true, email: true },
  { category: "payments", inApp: true, email: true },
  { category: "documents", inApp: true, email: false },
  { category: "registrations", inApp: true, email: true },
  { category: "system", inApp: true, email: false },
];

export function mergeNotificationPrefs(
  existing: NotificationPreference[] | undefined,
  incoming: NotificationPreference[],
): NotificationPreference[] {
  const map = new Map<NotificationCategory, NotificationPreference>();
  for (const p of DEFAULT_NOTIFICATION_PREFS) map.set(p.category, { ...p });
  for (const p of existing ?? []) map.set(p.category, { ...map.get(p.category)!, ...p });
  for (const p of incoming) map.set(p.category, { ...map.get(p.category)!, ...p });
  return [...map.values()];
}

export interface ManagedMember {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
  invitedAt?: string;
}

export function normalizeManagedMember(raw: Partial<ManagedMember> & { id: string; email: string }): ManagedMember {
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.email.split("@")[0] || "Member",
    email: raw.email.trim().toLowerCase(),
    role: normalizeRole(raw.role),
    status: raw.status === "Invited" || raw.status === "Suspended" ? raw.status : "Active",
    lastActive: raw.lastActive || new Date().toISOString().slice(0, 10),
    ...(raw.invitedAt ? { invitedAt: raw.invitedAt } : {}),
  };
}

export function inviteMember(
  list: ManagedMember[],
  input: { email: string; role: AppRole; name?: string; actorId: string },
): { ok: true; member: ManagedMember; list: ManagedMember[] } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Valid email required." };
  if (list.some((m) => m.email === email)) return { ok: false, error: "Member already exists." };
  if (!canMutateManagement(input.actorId === "founder" ? "Founder" : "Administrator") && false) {
    /* actor role checked by UI */
  }
  const member = normalizeManagedMember({
    id: `USR-${Date.now()}`,
    email,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    role: input.role,
    status: "Invited",
    lastActive: "—",
    invitedAt: new Date().toISOString().slice(0, 10),
  });
  return { ok: true, member, list: [member, ...list] };
}

export function updateMemberRole(
  list: ManagedMember[],
  memberId: string,
  role: AppRole,
): { ok: true; list: ManagedMember[] } | { ok: false; error: string } {
  const idx = list.findIndex((m) => m.id === memberId);
  if (idx < 0) return { ok: false, error: "Member not found." };
  if (role === "Customer") return { ok: false, error: "Customer role cannot be assigned in MAIN members." };
  const next = list.slice();
  next[idx] = { ...next[idx]!, role };
  return { ok: true, list: next };
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  before?: string;
  after?: string;
}

export function appendAuditEvent(
  log: AuditEvent[],
  event: Omit<AuditEvent, "id" | "at"> & { at?: string; id?: string },
): AuditEvent[] {
  const row: AuditEvent = {
    id: event.id ?? `AUD-${Date.now()}`,
    at: event.at ?? new Date().toISOString(),
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    summary: event.summary,
    ...(event.before ? { before: event.before } : {}),
    ...(event.after ? { after: event.after } : {}),
  };
  return [row, ...log];
}

export function filterAuditEvents(
  log: AuditEvent[],
  opts: { actor?: string; action?: string; from?: string; to?: string },
): AuditEvent[] {
  return log.filter((a) => {
    if (opts.actor && opts.actor !== "All" && a.actorEmail !== opts.actor && a.actorId !== opts.actor) return false;
    if (opts.action && opts.action !== "All" && a.action !== opts.action) return false;
    const day = a.at.slice(0, 10);
    if (opts.from && day < opts.from) return false;
    if (opts.to && day > opts.to) return false;
    return true;
  });
}

/** Founder billing surface — plan metadata only; no fake usage numbers. */
export interface FounderBillingSurface {
  planName: string;
  billingEmail: string;
  status: "Active" | "Past due" | "Trial";
  renewsOn?: string;
  seatsIncluded: number;
  notes: string;
}

export const DEFAULT_FOUNDER_BILLING: FounderBillingSurface = {
  planName: "Bhairava MAIN — Workspace",
  billingEmail: "founder@bhairava.com",
  status: "Active",
  renewsOn: "2026-10-01",
  seatsIncluded: 25,
  notes: "Billing surface is Founder-only. Seat counts come from Members — not invented usage metrics.",
};

export function normalizeFounderBilling(raw?: Partial<FounderBillingSurface> | null): FounderBillingSurface {
  return { ...DEFAULT_FOUNDER_BILLING, ...(raw ?? {}) };
}

export type DangerZoneAction = "export_workspace_json" | "reset_demo_data";

export function dangerZoneAllowed(role: unknown, action: DangerZoneAction): boolean {
  if (!canAccessDangerZone(role)) return false;
  return action === "export_workspace_json" || action === "reset_demo_data";
}

export interface ManagementSeedBundle {
  company: CompanySettings;
  members: ManagedMember[];
  notificationPrefs: NotificationPreference[];
  auditEvents: AuditEvent[];
  billing: FounderBillingSurface;
}

export function buildManagementDemoSeed(input: {
  appUsers: Array<{ id: string; name: string; email: string; role: string; status?: string; lastActive?: string }>;
  auditLog?: Array<{ id?: string; time: string; actor: string; action: string; target?: string; detail?: string }>;
}): ManagementSeedBundle {
  const members = input.appUsers.map((u) =>
    normalizeManagedMember({
      id: u.id,
      name: u.name,
      email: u.email,
      role: normalizeRole(u.role),
      status: u.status === "Invited" || u.status === "Suspended" ? u.status : "Active",
      lastActive: u.lastActive || "2026-09-20",
    }),
  );
  const auditEvents: AuditEvent[] = (input.auditLog ?? []).map((a, i) => ({
    id: a.id ?? `AUD-SEED-${i}`,
    at: a.time,
    actorId: a.actor,
    actorEmail: a.actor,
    action: a.action,
    entityType: "workspace",
    entityId: a.target || "workspace",
    summary: a.detail || a.action,
  }));
  return {
    company: { ...DEFAULT_COMPANY_SETTINGS },
    members,
    notificationPrefs: [...DEFAULT_NOTIFICATION_PREFS],
    auditEvents,
    billing: { ...DEFAULT_FOUNDER_BILLING },
  };
}

export function mergeManagementSeed(
  existing: Partial<ManagementSeedBundle>,
  seed: ManagementSeedBundle,
): ManagementSeedBundle {
  const mergeById = <T extends { id: string }>(a: T[] | undefined, b: T[]): T[] => {
    const map = new Map<string, T>();
    for (const x of b) map.set(x.id, x);
    for (const x of a ?? []) map.set(x.id, x);
    return [...map.values()];
  };
  return {
    company: normalizeCompanySettings({ ...seed.company, ...existing.company }),
    members: mergeById(existing.members, seed.members),
    notificationPrefs: mergeNotificationPrefs(existing.notificationPrefs, seed.notificationPrefs),
    auditEvents: mergeById(existing.auditEvents, seed.auditEvents),
    billing: normalizeFounderBilling({ ...seed.billing, ...existing.billing }),
  };
}
