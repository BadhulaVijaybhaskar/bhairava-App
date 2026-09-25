/**
 * Server-side permission vocabulary + role matrix.
 * Authz chain: auth → org → permission → project → ownership → field projection.
 */
export const ROLES = [
  'FOUNDER', 'ADMINISTRATOR', 'FINANCE', 'VIEWER', 'AGENT', 'CUSTOMER',
] as const;
export type RoleCode = (typeof ROLES)[number];

export const PERMISSIONS = [
  'org.manage',
  'users.manage',
  'projects.view',
  'projects.edit',
  'projects.lifecycle',
  'projects.publish',
  'projects.setup.edit',
  'projects.plots.edit',
  'projects.plots.status_override',
  'projects.plots.price_override',
  'sales.leads.manage',
  'sales.reservations.manage',
  'sales.bookings.manage',
  'sales.cancel.approve',
  'finance.view',
  'finance.operate',
  'finance.reconcile',
  'finance.commissions.manage',
  'documents.internal',
  'documents.agent_visible',
  'documents.customer_related',
  'reports.view',
  'audit.view',
  'settings.manage',
  'customers.pii.reveal',
] as const;
export type PermissionCode = (typeof PERMISSIONS)[number];

const ALL_STAFF: PermissionCode[] = [
  'projects.view', 'finance.view', 'reports.view',
];

const FULL_OPS: PermissionCode[] = [
  ...ALL_STAFF,
  'projects.edit', 'projects.lifecycle', 'projects.publish', 'projects.setup.edit',
  'projects.plots.edit', 'projects.plots.status_override', 'projects.plots.price_override',
  'sales.leads.manage', 'sales.reservations.manage', 'sales.bookings.manage', 'sales.cancel.approve',
  'finance.operate', 'finance.reconcile', 'finance.commissions.manage',
  'documents.internal', 'documents.agent_visible', 'documents.customer_related',
  'audit.view', 'settings.manage', 'users.manage', 'customers.pii.reveal',
];

export const ROLE_PERMISSIONS: Record<RoleCode, readonly PermissionCode[]> = {
  FOUNDER: [...FULL_OPS, 'org.manage'],
  ADMINISTRATOR: FULL_OPS,
  FINANCE: [
    'projects.view', 'finance.view', 'finance.operate', 'finance.reconcile',
    'finance.commissions.manage', 'documents.customer_related', 'reports.view',
    'customers.pii.reveal',
  ],
  VIEWER: ['projects.view', 'finance.view', 'reports.view', 'documents.internal'],
  AGENT: [
    'projects.view', 'sales.leads.manage', 'sales.reservations.manage', 'sales.bookings.manage',
    'finance.view', 'documents.agent_visible', 'documents.customer_related',
  ],
  CUSTOMER: ['projects.view', 'documents.customer_related', 'finance.view'],
};

export function roleHasPermission(role: RoleCode, permission: PermissionCode): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function normalizeRoleCode(raw: unknown): RoleCode {
  if (typeof raw !== 'string') return 'VIEWER';
  const s = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (s === 'ADMIN' || s === 'ADMINISTRATOR') return 'ADMINISTRATOR';
  if (s === 'FOUNDER') return 'FOUNDER';
  if (s === 'FINANCE') return 'FINANCE';
  if (s === 'VIEWER') return 'VIEWER';
  if (s === 'AGENT' || s === 'SALES') return 'AGENT';
  if (s === 'CUSTOMER') return 'CUSTOMER';
  const map: Record<string, RoleCode> = {
    Founder: 'FOUNDER', Administrator: 'ADMINISTRATOR', Finance: 'FINANCE',
    Viewer: 'VIEWER', Agent: 'AGENT', Customer: 'CUSTOMER', Sales: 'AGENT',
  };
  return map[raw.trim()] ?? 'VIEWER';
}