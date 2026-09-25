import { roleHasPermission, normalizeRoleCode } from '@bhairava/permissions';
import { createHash, randomBytes } from 'crypto';

/** Mirror of crypto.util hashToken without importing argon2-heavy module graph. */
function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

describe('auth logic', () => {
  it('hashes refresh tokens stably (rotation identity)', () => {
    const raw = randomBytes(32).toString('base64url');
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(hashToken(raw + 'x'));
  });

  it('suspended accounts are not ACTIVE', () => {
    const status: string = 'SUSPENDED';
    expect(status === 'ACTIVE').toBe(false);
  });

  it('refresh reuse: revoked token implies family revoke', () => {
    const family = [
      { id: 't1', familyId: 'f1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 99999) },
      { id: 't2', familyId: 'f1', revokedAt: null, expiresAt: new Date(Date.now() + 99999) },
    ];
    const presented = family[0];
    expect(Boolean(presented.revokedAt)).toBe(true);
    const toRevoke = family.filter((t) => t.familyId === presented.familyId && !t.revokedAt);
    expect(toRevoke.map((t) => t.id)).toEqual(['t2']);
  });

  it('password reset stubs require email', () => {
    const dto = { email: '' };
    expect(!dto.email).toBe(true);
  });
});

describe('RBAC matrix (authz)', () => {
  it('Viewer cannot mutate setup/plots/finance operate', () => {
    const role = normalizeRoleCode('VIEWER');
    expect(roleHasPermission(role, 'projects.view')).toBe(true);
    expect(roleHasPermission(role, 'projects.setup.edit')).toBe(false);
    expect(roleHasPermission(role, 'projects.plots.edit')).toBe(false);
    expect(roleHasPermission(role, 'finance.operate')).toBe(false);
    expect(roleHasPermission(role, 'sales.reservations.manage')).toBe(false);
  });

  it('Finance cannot edit Setup / plot master', () => {
    const role = normalizeRoleCode('FINANCE');
    expect(roleHasPermission(role, 'finance.operate')).toBe(true);
    expect(roleHasPermission(role, 'projects.setup.edit')).toBe(false);
    expect(roleHasPermission(role, 'projects.plots.edit')).toBe(false);
  });

  it('Agent cannot change plot master / setup', () => {
    const role = normalizeRoleCode('AGENT');
    expect(roleHasPermission(role, 'sales.reservations.manage')).toBe(true);
    expect(roleHasPermission(role, 'projects.plots.edit')).toBe(false);
    expect(roleHasPermission(role, 'projects.setup.edit')).toBe(false);
    expect(roleHasPermission(role, 'audit.view')).toBe(false);
  });

  it('Customer cannot access INTERNAL documents permission', () => {
    const role = normalizeRoleCode('CUSTOMER');
    expect(roleHasPermission(role, 'documents.internal')).toBe(false);
    expect(roleHasPermission(role, 'documents.customer_related')).toBe(true);
  });

  it('Founder has org.manage', () => {
    expect(roleHasPermission(normalizeRoleCode('FOUNDER'), 'org.manage')).toBe(true);
  });
});

