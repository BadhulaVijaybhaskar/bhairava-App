/**
 * Money helpers — never use float for persisted amounts.
 * Store as integer paise (INR * 100) or Decimal in DB; compute in integer/Decimal space.
 */
export type MoneyPaise = number; // integer paise

export function rupeesToPaise(rupees: number): MoneyPaise {
  if (!Number.isFinite(rupees)) throw new Error('Invalid rupees');
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: MoneyPaise): number {
  if (!Number.isInteger(paise)) throw new Error('Paise must be integer');
  return paise / 100;
}

export function addPaise(...parts: MoneyPaise[]): MoneyPaise {
  return parts.reduce((s, p) => {
    if (!Number.isInteger(p)) throw new Error('Paise must be integer');
    return s + p;
  }, 0);
}

export function assertNonNegativePaise(paise: MoneyPaise, label = 'amount'): void {
  if (!Number.isInteger(paise) || paise < 0) throw new Error(label + ' must be non-negative integer paise');
}
