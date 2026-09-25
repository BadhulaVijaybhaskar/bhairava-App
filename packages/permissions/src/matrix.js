"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.ROLES = void 0;
exports.roleHasPermission = roleHasPermission;
exports.normalizeRoleCode = normalizeRoleCode;
exports.ROLES = [
    'FOUNDER', 'ADMINISTRATOR', 'FINANCE', 'VIEWER', 'AGENT', 'CUSTOMER',
];
exports.PERMISSIONS = [
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
];
const ALL_STAFF = [
    'projects.view', 'finance.view', 'reports.view',
];
const FULL_OPS = [
    ...ALL_STAFF,
    'projects.edit', 'projects.lifecycle', 'projects.publish', 'projects.setup.edit',
    'projects.plots.edit', 'projects.plots.status_override', 'projects.plots.price_override',
    'sales.leads.manage', 'sales.reservations.manage', 'sales.bookings.manage', 'sales.cancel.approve',
    'finance.operate', 'finance.reconcile', 'finance.commissions.manage',
    'documents.internal', 'documents.agent_visible', 'documents.customer_related',
    'audit.view', 'settings.manage', 'users.manage', 'customers.pii.reveal',
];
exports.ROLE_PERMISSIONS = {
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
function roleHasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role].includes(permission);
}
function normalizeRoleCode(raw) {
    if (typeof raw !== 'string')
        return 'VIEWER';
    const s = raw.trim().toUpperCase().replace(/\s+/g, '_');
    if (s === 'ADMIN' || s === 'ADMINISTRATOR')
        return 'ADMINISTRATOR';
    if (s === 'FOUNDER')
        return 'FOUNDER';
    if (s === 'FINANCE')
        return 'FINANCE';
    if (s === 'VIEWER')
        return 'VIEWER';
    if (s === 'AGENT' || s === 'SALES')
        return 'AGENT';
    if (s === 'CUSTOMER')
        return 'CUSTOMER';
    const map = {
        Founder: 'FOUNDER', Administrator: 'ADMINISTRATOR', Finance: 'FINANCE',
        Viewer: 'VIEWER', Agent: 'AGENT', Customer: 'CUSTOMER', Sales: 'AGENT',
    };
    return map[raw.trim()] ?? 'VIEWER';
}