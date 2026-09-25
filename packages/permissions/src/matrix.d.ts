export declare const ROLES: readonly ["FOUNDER", "ADMINISTRATOR", "FINANCE", "VIEWER", "AGENT", "CUSTOMER"];
export type RoleCode = (typeof ROLES)[number];
export declare const PERMISSIONS: readonly ["org.manage", "users.manage", "projects.view", "projects.edit", "projects.lifecycle", "projects.publish", "projects.setup.edit", "projects.plots.edit", "projects.plots.status_override", "projects.plots.price_override", "sales.leads.manage", "sales.reservations.manage", "sales.bookings.manage", "sales.cancel.approve", "finance.view", "finance.operate", "finance.reconcile", "finance.commissions.manage", "documents.internal", "documents.agent_visible", "documents.customer_related", "reports.view", "audit.view", "settings.manage"];
export type PermissionCode = (typeof PERMISSIONS)[number];
export declare const ROLE_PERMISSIONS: Record<RoleCode, readonly PermissionCode[]>;
export declare function roleHasPermission(role: RoleCode, permission: PermissionCode): boolean;
export declare function normalizeRoleCode(raw: unknown): RoleCode;
