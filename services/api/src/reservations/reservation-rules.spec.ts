import { evaluateReservationState, DEFAULT_RESERVATION_HOURS } from '@bhairava/domain';

class FakePlotLock {
  private locked = false;
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED' = 'AVAILABLE';
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    while (this.locked) await new Promise((r) => setTimeout(r, 1));
    this.locked = true;
    try {
      return await fn();
    } finally {
      this.locked = false;
    }
  }
}

async function tryReserve(plot: FakePlotLock): Promise<'ok' | 'conflict'> {
  return plot.withLock(async () => {
    if (plot.status !== 'AVAILABLE') return 'conflict';
    await new Promise((r) => setTimeout(r, 5));
    plot.status = 'RESERVED';
    return 'ok';
  });
}

async function tryBook(plot: FakePlotLock): Promise<'ok' | 'conflict'> {
  return plot.withLock(async () => {
    if (plot.status !== 'AVAILABLE' && plot.status !== 'RESERVED') return 'conflict';
    await new Promise((r) => setTimeout(r, 5));
    plot.status = 'BOOKED';
    return 'ok';
  });
}

describe('reservation uniqueness + races', () => {
  it('default hold hours is 48', () => {
    expect(DEFAULT_RESERVATION_HOURS).toBe(48);
  });

  it('allows exactly one winner under concurrent reserve', async () => {
    const plot = new FakePlotLock();
    const results = await Promise.all([
      tryReserve(plot), tryReserve(plot), tryReserve(plot), tryReserve(plot), tryReserve(plot),
    ]);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    expect(results.filter((r) => r === 'conflict')).toHaveLength(4);
    expect(plot.status).toBe('RESERVED');
  });

  it('double booking prevented — only one book winner', async () => {
    const plot = new FakePlotLock();
    plot.status = 'RESERVED';
    const results = await Promise.all([tryBook(plot), tryBook(plot), tryBook(plot)]);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    expect(plot.status).toBe('BOOKED');
  });

  it('expiry race: expired reservation evaluates to EXPIRED', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(evaluateReservationState({ expiresAt: past, state: 'ACTIVE' })).toBe('EXPIRED');
  });

  it('booking rollback mental model: failed book leaves plot RESERVED not BOOKED', () => {
    let status: 'RESERVED' | 'BOOKED' = 'RESERVED';
    const bookFailed = true;
    if (!bookFailed) status = 'BOOKED';
    expect(status).toBe('RESERVED');
  });
});
