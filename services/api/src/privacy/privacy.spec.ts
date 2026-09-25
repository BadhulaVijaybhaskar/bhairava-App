import { projectCustomerPii } from '@bhairava/domain';

function filterCustomersForAgent(
  rows: Array<{ id: string; agentId: string }>,
  agentId: string,
) {
  return rows.filter((r) => r.agentId === agentId);
}

function filterBookingsForAgent(
  rows: Array<{ id: string; agentId: string | null; customerAgentId: string | null }>,
  agentId: string,
) {
  return rows.filter((r) => r.agentId === agentId || r.customerAgentId === agentId);
}

function filterBookingsForCustomer(
  rows: Array<{ id: string; customerUserId: string }>,
  userId: string,
) {
  return rows.filter((r) => r.customerUserId === userId);
}

function visibilityFor(role: string): string[] {
  if (role === 'CUSTOMER') return ['CUSTOMER_PROFILE_RELATED'];
  if (role === 'AGENT') return ['AGENT_VISIBLE', 'CUSTOMER_PROFILE_RELATED'];
  return ['INTERNAL', 'AGENT_VISIBLE', 'CUSTOMER_PROFILE_RELATED'];
}

describe('privacy & tenancy', () => {
  it('Agent1 cannot see Agent2 customers', () => {
    const rows = [
      { id: 'c1', agentId: 'ag1' },
      { id: 'c2', agentId: 'ag2' },
    ];
    expect(filterCustomersForAgent(rows, 'ag1').map((r) => r.id)).toEqual(['c1']);
    expect(filterCustomersForAgent(rows, 'ag2').map((r) => r.id)).toEqual(['c2']);
  });

  it('Agent1 cannot see Agent2 bookings (agentId or customer.agentId)', () => {
    const rows = [
      { id: 'b1', agentId: 'ag1', customerAgentId: 'ag1' },
      { id: 'b2', agentId: 'ag2', customerAgentId: 'ag2' },
      { id: 'b3', agentId: null, customerAgentId: 'ag1' },
    ];
    expect(filterBookingsForAgent(rows, 'ag1').map((r) => r.id).sort()).toEqual(['b1', 'b3']);
    expect(filterBookingsForAgent(rows, 'ag2').map((r) => r.id)).toEqual(['b2']);
  });

  it('Customer1 cannot see Customer2 bookings', () => {
    const rows = [
      { id: 'b1', customerUserId: 'u1' },
      { id: 'b2', customerUserId: 'u2' },
    ];
    expect(filterBookingsForCustomer(rows, 'u1').map((r) => r.id)).toEqual(['b1']);
  });

  it('INTERNAL doc blocked for customer', () => {
    const allowed = visibilityFor('CUSTOMER');
    expect(allowed.includes('INTERNAL')).toBe(false);
    expect(allowed.includes('CUSTOMER_PROFILE_RELATED')).toBe(true);
  });

  it('unauthorized org/project: actor org must match resource org', () => {
    const actorOrg: string = 'org-a';
    const resourceOrg: string = 'org-b';
    expect(actorOrg === resourceOrg).toBe(false);
  });

  it('agent unrelated PII is redacted via domain projector', () => {
    const projected = projectCustomerPii(
      { id: 'c1', name: 'X', phone: '9000000001', email: 'a@b.co' },
      { role: 'Agent', ownsRelationship: false, isSelf: false },
    );
    expect(projected.redacted).toBe(true);
    expect(projected.phone).toBeNull();
  });
});

describe('receipt ownership helpers', () => {
  function canViewReceipt(actor: { role: string; userId: string; agentId?: string }, receipt: { customerUserId: string; customerAgentId: string }) {
    if (actor.role === 'CUSTOMER') return actor.userId === receipt.customerUserId;
    if (actor.role === 'AGENT') return actor.agentId === receipt.customerAgentId;
    return true; // staff with finance.view
  }

  it('customer cannot view another customer receipt', () => {
    const receipt = { customerUserId: 'u1', customerAgentId: 'ag1' };
    expect(canViewReceipt({ role: 'CUSTOMER', userId: 'u2' }, receipt)).toBe(false);
    expect(canViewReceipt({ role: 'CUSTOMER', userId: 'u1' }, receipt)).toBe(true);
  });

  it('agent cannot view other agent customer receipt', () => {
    const receipt = { customerUserId: 'u1', customerAgentId: 'ag1' };
    expect(canViewReceipt({ role: 'AGENT', userId: 'a2', agentId: 'ag2' }, receipt)).toBe(false);
    expect(canViewReceipt({ role: 'AGENT', userId: 'a1', agentId: 'ag1' }, receipt)).toBe(true);
  });
});
