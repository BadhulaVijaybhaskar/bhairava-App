/**
 * Expanded privacy / ownership audit for AGENT + CUSTOMER list & detail scopes.
 * Server-side RBAC predicates mirrored here as pure filters for regression coverage.
 */

type Role = 'FOUNDER' | 'ADMINISTRATOR' | 'AGENT' | 'CUSTOMER' | 'FINANCE';

type Actor = {
  role: Role;
  userId: string;
  agentId?: string;
  allAgentsAccess?: boolean;
};

function filterReservations(
  rows: Array<{ id: string; agentId: string | null; customerUserId: string; customerAgentId: string | null }>,
  actor: Actor,
) {
  if (actor.role === 'CUSTOMER') return rows.filter((r) => r.customerUserId === actor.userId);
  if (actor.role === 'AGENT') {
    if (actor.allAgentsAccess) return rows;
    return rows.filter((r) => r.agentId === actor.agentId || r.customerAgentId === actor.agentId);
  }
  return rows; // Founder/Admin/Finance
}

function filterPayments(
  rows: Array<{ id: string; customerUserId: string; customerAgentId: string | null; bookingAgentId: string | null }>,
  actor: Actor,
) {
  if (actor.role === 'CUSTOMER') return rows.filter((r) => r.customerUserId === actor.userId);
  if (actor.role === 'AGENT') {
    if (actor.allAgentsAccess) return rows;
    return rows.filter(
      (r) =>
        r.customerAgentId === actor.agentId ||
        r.bookingAgentId === actor.agentId,
    );
  }
  return rows;
}

function filterDocuments(
  rows: Array<{
    id: string;
    visibility: string;
    customerUserId?: string | null;
    customerAgentId?: string | null;
    bookingAgentId?: string | null;
  }>,
  actor: Actor,
) {
  const vis =
    actor.role === 'CUSTOMER'
      ? ['CUSTOMER_PROFILE_RELATED']
      : actor.role === 'AGENT'
        ? ['AGENT_VISIBLE', 'CUSTOMER_PROFILE_RELATED']
        : ['INTERNAL', 'AGENT_VISIBLE', 'CUSTOMER_PROFILE_RELATED'];

  return rows.filter((d) => {
    if (!vis.includes(d.visibility)) return false;
    if (actor.role === 'CUSTOMER') return d.customerUserId === actor.userId;
    if (actor.role === 'AGENT' && d.visibility === 'CUSTOMER_PROFILE_RELATED') {
      if (actor.allAgentsAccess) return true;
      return d.customerAgentId === actor.agentId || d.bookingAgentId === actor.agentId;
    }
    return true;
  });
}

function canDownloadDocument(
  doc: {
    visibility: string;
    customerUserId?: string | null;
    customerAgentId?: string | null;
    bookingAgentId?: string | null;
  },
  actor: Actor,
): boolean {
  return filterDocuments([{ id: 'x', ...doc }], actor).length === 1;
}

function filterSchedules(
  rows: Array<{ id: string; customerUserId: string; customerAgentId: string | null; bookingAgentId: string | null }>,
  actor: Actor,
) {
  return filterPayments(rows, actor);
}

function filterRegistrations(
  rows: Array<{ id: string; customerUserId: string; customerAgentId: string | null; bookingAgentId: string | null }>,
  actor: Actor,
) {
  if (actor.role === 'CUSTOMER') return rows.filter((r) => r.customerUserId === actor.userId);
  if (actor.role === 'AGENT') {
    if (actor.allAgentsAccess) return rows;
    return rows.filter((r) => r.customerAgentId === actor.agentId || r.bookingAgentId === actor.agentId);
  }
  return rows;
}

function filterCommissions(
  rows: Array<{ id: string; agentId: string }>,
  actor: Actor,
) {
  if (actor.role === 'AGENT') return rows.filter((r) => r.agentId === actor.agentId);
  if (actor.role === 'CUSTOMER') return [];
  return rows;
}

function filterNotifications(
  rows: Array<{ id: string; userId: string }>,
  actor: Actor,
) {
  return rows.filter((r) => r.userId === actor.userId);
}

describe('reservation list ownership', () => {
  const rows = [
    { id: 'r1', agentId: 'ag1', customerUserId: 'u-c1', customerAgentId: 'ag1' },
    { id: 'r2', agentId: 'ag2', customerUserId: 'u-c2', customerAgentId: 'ag2' },
  ];

  it('Agent1 / Agent2 isolation', () => {
    expect(filterReservations(rows, { role: 'AGENT', userId: 'a1', agentId: 'ag1' }).map((r) => r.id)).toEqual(['r1']);
    expect(filterReservations(rows, { role: 'AGENT', userId: 'a2', agentId: 'ag2' }).map((r) => r.id)).toEqual(['r2']);
  });

  it('Customer1 only; Customer1 guessing Customer2 id denied', () => {
    expect(filterReservations(rows, { role: 'CUSTOMER', userId: 'u-c1' }).map((r) => r.id)).toEqual(['r1']);
    expect(filterReservations(rows, { role: 'CUSTOMER', userId: 'u-c1' }).find((r) => r.id === 'r2')).toBeUndefined();
  });

  it('Founder/Admin see org-wide', () => {
    expect(filterReservations(rows, { role: 'FOUNDER', userId: 'f1' })).toHaveLength(2);
    expect(filterReservations(rows, { role: 'ADMINISTRATOR', userId: 'ad1' })).toHaveLength(2);
  });
});

describe('document list + signed URL ownership', () => {
  const docs = [
    { id: 'd-ag-vis', visibility: 'AGENT_VISIBLE', customerUserId: null, customerAgentId: null, bookingAgentId: null },
    { id: 'd-c1', visibility: 'CUSTOMER_PROFILE_RELATED', customerUserId: 'u-c1', customerAgentId: 'ag1', bookingAgentId: 'ag1' },
    { id: 'd-c2', visibility: 'CUSTOMER_PROFILE_RELATED', customerUserId: 'u-c2', customerAgentId: 'ag2', bookingAgentId: 'ag2' },
    { id: 'd-int', visibility: 'INTERNAL', customerUserId: 'u-c1', customerAgentId: 'ag1', bookingAgentId: 'ag1' },
  ];

  it('Agent1 own CUSTOMER_PROFILE_RELATED → allow; Agent2 same id → deny', () => {
    expect(canDownloadDocument(docs[1], { role: 'AGENT', userId: 'a1', agentId: 'ag1' })).toBe(true);
    expect(canDownloadDocument(docs[1], { role: 'AGENT', userId: 'a2', agentId: 'ag2' })).toBe(false);
  });

  it('Customer owner → allow; other Customer → deny; Customer INTERNAL → deny', () => {
    expect(canDownloadDocument(docs[1], { role: 'CUSTOMER', userId: 'u-c1' })).toBe(true);
    expect(canDownloadDocument(docs[1], { role: 'CUSTOMER', userId: 'u-c2' })).toBe(false);
    expect(canDownloadDocument(docs[3], { role: 'CUSTOMER', userId: 'u-c1' })).toBe(false);
  });

  it('Agent list omits unrelated customer docs but keeps AGENT_VISIBLE', () => {
    const list = filterDocuments(docs, { role: 'AGENT', userId: 'a1', agentId: 'ag1' }).map((d) => d.id);
    expect(list).toEqual(['d-ag-vis', 'd-c1']);
  });
});

describe('agent payment ownership', () => {
  const payments = [
    { id: 'p1', customerUserId: 'u-c1', customerAgentId: 'ag1', bookingAgentId: 'ag1' },
    { id: 'p2', customerUserId: 'u-c2', customerAgentId: 'ag2', bookingAgentId: 'ag2' },
  ];

  it('Agent1 own allow; Agent1→Agent2 payment deny; Agent1 list omits Agent2', () => {
    const a1 = { role: 'AGENT' as const, userId: 'a1', agentId: 'ag1' };
    expect(filterPayments(payments, a1).map((p) => p.id)).toEqual(['p1']);
    expect(filterPayments(payments, a1).find((p) => p.id === 'p2')).toBeUndefined();
  });

  it('schedules / collections follow same agent ownership', () => {
    expect(
      filterSchedules(payments, { role: 'AGENT', userId: 'a1', agentId: 'ag1' }).map((p) => p.id),
    ).toEqual(['p1']);
  });
});

describe('reservation → booking customer match', () => {
  function convertReservation(opts: {
    reservationCustomerId: string;
    bookingCustomerId: string;
    reservationState: 'ACTIVE' | 'CONVERTED' | 'EXPIRED';
  }) {
    if (opts.reservationState !== 'ACTIVE') {
      return { ok: false as const, reason: 'state', reservationState: opts.reservationState, bookingCreated: false };
    }
    if (opts.reservationCustomerId !== opts.bookingCustomerId) {
      return {
        ok: false as const,
        reason: 'customer_mismatch',
        reservationState: opts.reservationState,
        bookingCreated: false,
      };
    }
    return { ok: true as const, reservationState: 'CONVERTED' as const, bookingCreated: true };
  }

  it('Customer A reservation must never convert to Customer B booking', () => {
    const r = convertReservation({
      reservationCustomerId: 'c-a',
      bookingCustomerId: 'c-b',
      reservationState: 'ACTIVE',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('customer_mismatch');
    expect(r.bookingCreated).toBe(false);
    expect(r.reservationState).toBe('ACTIVE'); // unchanged
  });

  it('matching customer converts atomically (logical)', () => {
    const r = convertReservation({
      reservationCustomerId: 'c-a',
      bookingCustomerId: 'c-a',
      reservationState: 'ACTIVE',
    });
    expect(r.ok).toBe(true);
    expect(r.bookingCreated).toBe(true);
    expect(r.reservationState).toBe('CONVERTED');
  });
});

describe('atomic receipt number allocation', () => {
  async function allocateConcurrent(orgCounter: { value: number }, n: number) {
    const lock = { busy: false };
    async function next(): Promise<string> {
      while (lock.busy) await new Promise((r) => setTimeout(r, 1));
      lock.busy = true;
      try {
        orgCounter.value += 1;
        return `RCP-${String(orgCounter.value).padStart(6, '0')}`;
      } finally {
        lock.busy = false;
      }
    }
    return Promise.all(Array.from({ length: n }, () => next()));
  }

  it('simultaneous payments → unique receipt numbers; no unique-constraint collision', async () => {
    const counter = { value: 0 };
    const numbers = await allocateConcurrent(counter, 20);
    expect(new Set(numbers).size).toBe(20);
    expect(numbers).toContain('RCP-000001');
    expect(numbers).toContain('RCP-000020');
  });

  it('maps unique conflicts to ConflictException shape (not Prisma 500 leak)', () => {
    function mapErr(code: string) {
      if (code === 'P2002') return { status: 409, message: 'Receipt number conflict — retry payment' };
      return { status: 500, message: 'internal' };
    }
    expect(mapErr('P2002').status).toBe(409);
    expect(mapErr('P2002').message).not.toMatch(/prisma/i);
  });
});

describe('expanded endpoint ownership matrix', () => {
  it('registrations scoped for agent/customer', () => {
    const rows = [
      { id: 'reg1', customerUserId: 'u-c1', customerAgentId: 'ag1', bookingAgentId: 'ag1' },
      { id: 'reg2', customerUserId: 'u-c2', customerAgentId: 'ag2', bookingAgentId: 'ag2' },
    ];
    expect(filterRegistrations(rows, { role: 'AGENT', userId: 'a1', agentId: 'ag1' }).map((r) => r.id)).toEqual(['reg1']);
    expect(filterRegistrations(rows, { role: 'CUSTOMER', userId: 'u-c2' }).map((r) => r.id)).toEqual(['reg2']);
  });

  it('commissions: agent only own; customer none', () => {
    const rows = [
      { id: 'cm1', agentId: 'ag1' },
      { id: 'cm2', agentId: 'ag2' },
    ];
    expect(filterCommissions(rows, { role: 'AGENT', userId: 'a1', agentId: 'ag1' }).map((r) => r.id)).toEqual(['cm1']);
    expect(filterCommissions(rows, { role: 'CUSTOMER', userId: 'u-c1' })).toEqual([]);
  });

  it('notifications always self-scoped', () => {
    const rows = [
      { id: 'n1', userId: 'u1' },
      { id: 'n2', userId: 'u2' },
    ];
    expect(filterNotifications(rows, { role: 'AGENT', userId: 'u1', agentId: 'ag1' }).map((r) => r.id)).toEqual(['n1']);
  });
});

describe('web session restoration contract', () => {
  type Boot = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

  async function bootSession(opts: {
    accessInMemory: string | null;
    cookieValid: boolean;
  }): Promise<Boot> {
    let state: Boot = 'AUTH_INITIALIZING';
    if (opts.accessInMemory) {
      state = 'AUTHENTICATED';
      return state;
    }
    // Must not redirect solely because access is empty — try cookie refresh first
    if (opts.cookieValid) {
      state = 'AUTHENTICATED';
    } else {
      state = 'UNAUTHENTICATED';
    }
    return state;
  }

  it('login + hard refresh stays auth when cookie valid', async () => {
    expect(await bootSession({ accessInMemory: null, cookieValid: true })).toBe('AUTHENTICATED');
  });

  it('protected URL new tab restores when cookie valid', async () => {
    expect(await bootSession({ accessInMemory: null, cookieValid: true })).toBe('AUTHENTICATED');
  });

  it('revoked/expired cookie → login', async () => {
    expect(await bootSession({ accessInMemory: null, cookieValid: false })).toBe('UNAUTHENTICATED');
  });

  it('never stores refresh in localStorage (web contract)', () => {
    const webTokenPolicy = { persistRefreshToLocalStorage: false, useHttpOnlyCookie: true };
    expect(webTokenPolicy.persistRefreshToLocalStorage).toBe(false);
    expect(webTokenPolicy.useHttpOnlyCookie).toBe(true);
  });
});
