describe('payment adjustment / reversal rules', () => {
  type Payment = {
    id: string;
    voidedAt: Date | null;
    reconciliationStatus: string;
    notes: string | null;
  };

  function voidPayment(p: Payment, reason: string) {
    if (!reason.trim()) throw new Error('void reason required');
    if (p.voidedAt) throw new Error('already voided');
    return {
      ...p,
      voidedAt: new Date(),
      reconciliationStatus: 'REVERSED',
      notes: reason,
    };
  }

  function adjustPayment(p: Payment, reason: string) {
    if (!reason.trim()) throw new Error('adjustment reason required');
    if (p.voidedAt) throw new Error('cannot adjust voided payment');
    return {
      ...p,
      reconciliationStatus: 'ADJUSTED',
      notes: [p.notes, `ADJUST: ${reason}`].filter(Boolean).join(' | '),
    };
  }

  it('soft-voids payment (no hard delete)', () => {
    const p: Payment = { id: '1', voidedAt: null, reconciliationStatus: 'UNRECONCILED', notes: null };
    const v = voidPayment(p, 'duplicate entry');
    expect(v.voidedAt).toBeTruthy();
    expect(v.reconciliationStatus).toBe('REVERSED');
  });

  it('rejects double void', () => {
    const p: Payment = { id: '1', voidedAt: new Date(), reconciliationStatus: 'REVERSED', notes: 'x' };
    expect(() => voidPayment(p, 'again')).toThrow(/already voided/);
  });

  it('adjust marks ADJUSTED and appends note', () => {
    const p: Payment = { id: '1', voidedAt: null, reconciliationStatus: 'UNRECONCILED', notes: 'base' };
    const a = adjustPayment(p, 'typo amount');
    expect(a.reconciliationStatus).toBe('ADJUSTED');
    expect(a.notes).toContain('ADJUST: typo amount');
  });

  it('cannot adjust after void', () => {
    const p: Payment = { id: '1', voidedAt: new Date(), reconciliationStatus: 'REVERSED', notes: null };
    expect(() => adjustPayment(p, 'nope')).toThrow(/cannot adjust/);
  });
});
