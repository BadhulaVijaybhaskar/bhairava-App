import {
  decideMpinLock,
  isMpinEligibleRole,
  needsMpinSetup,
  nextMpinFailureState,
  normalizeMpinLoginIdentifier,
  validateMpinConfirm,
  validateMpinFormat,
  MPIN_MAX_FAILED_ATTEMPTS,
} from '@bhairava/domain';

describe('MPIN format', () => {
  it('accepts exactly 4 digits', () => {
    expect(validateMpinFormat('1234')).toEqual({ ok: true, mpin: '1234' });
  });

  it('rejects invalid length', () => {
    expect(validateMpinFormat('123').ok).toBe(false);
    expect(validateMpinFormat('12345').ok).toBe(false);
    expect(validateMpinFormat('').ok).toBe(false);
  });

  it('rejects non-numeric', () => {
    expect(validateMpinFormat('12a4').ok).toBe(false);
    expect(validateMpinFormat('12 4').ok).toBe(false);
    expect(validateMpinFormat(null).ok).toBe(false);
  });

  it('confirm must match', () => {
    expect(validateMpinConfirm('1234', '1234').ok).toBe(true);
    expect(validateMpinConfirm('1234', '4321').ok).toBe(false);
  });

  it('mismatch returns message "pin not matched"', () => {
    const result = validateMpinConfirm('1234', '4321');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('pin not matched');
      expect(result.code).toBe('INVALID_MPIN_FORMAT');
    }
  });
});

describe('MPIN lockout', () => {
  it('locks after max failed attempts', () => {
    let attempts = 0;
    let justLocked = false;
    for (let i = 0; i < MPIN_MAX_FAILED_ATTEMPTS; i++) {
      const next = nextMpinFailureState({ failedAttempts: attempts });
      attempts = next.mpinFailedAttempts;
      justLocked = next.justLocked;
    }
    expect(attempts).toBe(MPIN_MAX_FAILED_ATTEMPTS);
    expect(justLocked).toBe(true);
  });

  it('respects lockedUntil', () => {
    const until = new Date(Date.now() + 60_000);
    const d = decideMpinLock({ lockedUntil: until });
    expect(d.locked).toBe(true);
  });

  it('clears expired lock', () => {
    const until = new Date(Date.now() - 1000);
    expect(decideMpinLock({ lockedUntil: until }).locked).toBe(false);
  });
});

describe('MPIN setup gate + roles', () => {
  it('needs setup only for Customer/Agent with profile and no MPIN', () => {
    expect(
      needsMpinSetup({
        roleCode: 'CUSTOMER',
        profileCompletedAt: new Date(),
        mpinSetAt: null,
      }),
    ).toBe(true);
    expect(
      needsMpinSetup({
        roleCode: 'AGENT',
        profileCompletedAt: new Date(),
        mpinSetAt: new Date(),
      }),
    ).toBe(false);
    expect(
      needsMpinSetup({
        roleCode: 'FOUNDER',
        profileCompletedAt: new Date(),
        mpinSetAt: null,
      }),
    ).toBe(false);
  });

  it('Customer and Agent eligible; Admin not', () => {
    expect(isMpinEligibleRole('CUSTOMER')).toBe(true);
    expect(isMpinEligibleRole('AGENT')).toBe(true);
    expect(isMpinEligibleRole('ADMIN')).toBe(false);
  });
});

describe('identifier normalize', () => {
  it('lowercases email', () => {
    expect(normalizeMpinLoginIdentifier('Ada@Example.COM')).toBe('ada@example.com');
  });

  it('keeps last-10 mobile digits', () => {
    expect(normalizeMpinLoginIdentifier('+91 98765 43210')).toBe('9876543210');
  });
});

describe('plaintext never in public helpers', () => {
  it('validate helpers only return formatted digits or errors — no hash/store', () => {
    const v = validateMpinFormat('9876');
    expect(v).toEqual({ ok: true, mpin: '9876' });
    expect(JSON.stringify(v)).not.toMatch(/argon|hash|\$argon/i);
  });
});
