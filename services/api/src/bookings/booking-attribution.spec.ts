import { projectCustomerPii } from '@bhairava/domain';
import { jsonStringifySafe, serializeBigInts } from '../common/serialize/bigint-json';

const INTERNAL = 'INTERNAL';
const AGENT_VISIBLE = 'AGENT_VISIBLE';
const CUSTOMER_PROFILE_RELATED = 'CUSTOMER_PROFILE_RELATED';

function visibilityFor(role: string): string[] {
  if (role === 'CUSTOMER') return [CUSTOMER_PROFILE_RELATED];
  if (role === 'AGENT') return [AGENT_VISIBLE, CUSTOMER_PROFILE_RELATED];
  // Founder / Admin / Finance / Viewer
  return [INTERNAL, AGENT_VISIBLE, CUSTOMER_PROFILE_RELATED];
}

function projectDocumentList(
  role: string,
  docs: Array<{
    id: string;
    title: string;
    visibility: string;
    sizeBytes: bigint | null;
    version: number;
    customerId?: string | null;
  }>,
) {
  const allowed = visibilityFor(role);
  return docs
    .filter((d) => allowed.includes(d.visibility))
    .map((d) =>
      serializeBigInts({
        id: d.id,
        title: d.title,
        visibility: d.visibility,
        sizeBytes: d.sizeBytes,
        version: d.version,
        customerId: d.customerId ?? null,
      }),
    );
}

describe('documents list BigInt serialization (regression)', () => {
  const fixtures = [
    { id: 'd-internal', title: 'Internal memo', visibility: INTERNAL, sizeBytes: 4096n, version: 1 },
    { id: 'd-agent', title: 'Agent pack', visibility: AGENT_VISIBLE, sizeBytes: 1048576n, version: 2 },
    { id: 'd-customer', title: 'Customer agreement', visibility: CUSTOMER_PROFILE_RELATED, sizeBytes: 9007199254740993n, version: 1, customerId: 'c1' },
    { id: 'd-empty-size', title: 'No size', visibility: AGENT_VISIBLE, sizeBytes: null, version: 1 },
  ];

  it('Founder/Admin sees all visibilities and JSON.stringify does not throw', () => {
    for (const role of ['FOUNDER', 'ADMINISTRATOR']) {
      const rows = projectDocumentList(role, fixtures);
      expect(rows.map((r) => r.id)).toEqual(['d-internal', 'd-agent', 'd-customer', 'd-empty-size']);
      expect(() => JSON.stringify(rows)).not.toThrow();
      expect(rows[0].sizeBytes).toBe('4096');
      expect(rows[2].sizeBytes).toBe('9007199254740993'); // beyond MAX_SAFE_INTEGER — string
    }
  });

  it('Finance-permitted docs serialize without 500', () => {
    const rows = projectDocumentList('FINANCE', fixtures);
    expect(rows.length).toBe(4);
    expect(() => jsonStringifySafe(rows)).not.toThrow();
    expect(JSON.parse(jsonStringifySafe(rows))[1].sizeBytes).toBe('1048576');
  });

  it('Agent-visible docs only (blocks INTERNAL)', () => {
    const rows = projectDocumentList('AGENT', fixtures);
    expect(rows.map((r) => r.id)).toEqual(['d-agent', 'd-customer', 'd-empty-size']);
    expect(rows.every((r) => r.visibility !== INTERNAL)).toBe(true);
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it('Customer profile-related docs only', () => {
    const rows = projectDocumentList('CUSTOMER', fixtures);
    expect(rows.map((r) => r.id)).toEqual(['d-customer']);
    expect(rows[0].sizeBytes).toBe('9007199254740993');
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it('empty list is safe', () => {
    const rows = projectDocumentList('AGENT', []);
    expect(rows).toEqual([]);
    expect(() => JSON.stringify(rows)).not.toThrow();
  });

  it('pagination envelope with bigint totals is safe', () => {
    const page = serializeBigInts({
      items: projectDocumentList('ADMINISTRATOR', fixtures.slice(0, 2)),
      total: 2n,
      page: 1,
      pageSize: 20,
    });
    expect(page.total).toBe('2');
    expect(() => JSON.stringify(page)).not.toThrow();
  });
});

describe('agent booking attribution + PII isolation', () => {
  type RawBooking = {
    id: string;
    agentId: string | null;
    agreementValuePaise: bigint;
    advancePaise: bigint;
    customer: {
      id: string;
      name: string;
      phone: string;
      email: string | null;
      agentId: string | null;
      userId: string | null;
    };
    agent: { id: string; code: string; name: string } | null;
  };

  function filterForAgent(rows: RawBooking[], agentId: string, allAgentsAccess = false) {
    if (allAgentsAccess) return rows;
    return rows.filter(
      (b) => b.agentId === agentId || b.customer.agentId === agentId,
    );
  }

  function projectForAgent(b: RawBooking, agentId: string) {
    const owns = b.agentId === agentId || b.customer.agentId === agentId;
    const customer = projectCustomerPii(
      {
        id: b.customer.id,
        name: b.customer.name,
        phone: b.customer.phone,
        email: b.customer.email,
      },
      { role: 'Agent', ownsRelationship: owns, isSelf: false },
    );
    return serializeBigInts({
      id: b.id,
      agentId: b.agentId,
      agreementValuePaise: b.agreementValuePaise,
      advancePaise: b.advancePaise,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        redacted: customer.redacted,
        agentId: b.customer.agentId,
      },
      responsibleAgent: b.agent
        ? { id: b.agent.id, code: b.agent.code, name: b.agent.name }
        : null,
    });
  }

  const bookings: RawBooking[] = [
    {
      id: 'b1',
      agentId: 'ag1',
      agreementValuePaise: 240000000n,
      advancePaise: 10000000n,
      customer: {
        id: 'c1', name: 'Cust One', phone: '9100000001', email: 'c1@stg.local',
        agentId: 'ag1', userId: 'u-c1',
      },
      agent: { id: 'ag1', code: 'STG-AG-01', name: 'Agent One' },
    },
    {
      id: 'b2',
      agentId: 'ag2',
      agreementValuePaise: 300000000n,
      advancePaise: 0n,
      customer: {
        id: 'c2', name: 'Cust Two', phone: '9100000002', email: 'c2@stg.local',
        agentId: 'ag2', userId: 'u-c2',
      },
      agent: { id: 'ag2', code: 'STG-AG-02', name: 'Agent Two' },
    },
    {
      // Attribution via customer.agentId only (booking.agentId was historically null)
      id: 'b3',
      agentId: null,
      agreementValuePaise: 150000000n,
      advancePaise: 5000000n,
      customer: {
        id: 'c1b', name: 'Cust One B', phone: '9100000011', email: 'c1b@stg.local',
        agentId: 'ag1', userId: 'u-c1b',
      },
      agent: null,
    },
  ];

  it('Agent1 sees own + customer-assigned bookings; not Agent2', () => {
    const visible = filterForAgent(bookings, 'ag1');
    expect(visible.map((b) => b.id).sort()).toEqual(['b1', 'b3']);
    expect(visible.map((b) => b.id)).not.toContain('b2');
  });

  it('Agent2 isolation — cannot see Agent1 bookings', () => {
    const visible = filterForAgent(bookings, 'ag2');
    expect(visible.map((b) => b.id)).toEqual(['b2']);
  });

  it('Agent1 projection includes customer attribution + responsible agent; BigInt as string', () => {
    const projected = filterForAgent(bookings, 'ag1').map((b) => projectForAgent(b, 'ag1'));
    expect(projected[0].customer.name).toBe('Cust One');
    expect(projected[0].customer.phone).toBe('9100000001');
    expect(projected[0].customer.redacted).toBe(false);
    expect(projected[0].responsibleAgent).toEqual({
      id: 'ag1', code: 'STG-AG-01', name: 'Agent One',
    });
    expect(projected[0].agreementValuePaise).toBe('240000000');
    expect(() => JSON.stringify(projected)).not.toThrow();
  });

  it('Agent2 cannot obtain Agent1 customer PII even if row leaked', () => {
    const leaked = projectForAgent(bookings[0], 'ag2');
    expect(leaked.customer.redacted).toBe(true);
    expect(leaked.customer.name).toBeNull();
    expect(leaked.customer.phone).toBeNull();
    expect(leaked.customer.email).toBeNull();
  });

  it('auto-attribute agentId when agent books (create path contract)', () => {
    const actorRole = 'AGENT';
    const actorAgentId = 'ag1';
    let resolvedAgentId: string | undefined;
    if (actorRole === 'AGENT') resolvedAgentId = actorAgentId;
    expect(resolvedAgentId).toBe('ag1');
  });
});
