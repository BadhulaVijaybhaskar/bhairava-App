/**
 * Coherent P4 demo seed: fully paid, partial, overdue, upcoming,
 * reconciled, adjustment/reversal, commission paid + pending.
 */
import type { Booking } from "@/lib/mock-data";
import {
  addDaysIso,
  createDefaultScheduleForBooking,
  earnCommissionFromBooking,
  isoDateOnly,
  linkPaymentToSchedule,
  type CommissionRecord,
  type CommissionRule,
  type FinancePayment,
  type PaymentAdjustment,
  type PaymentMethod,
  type PaymentScheduleItem,
} from "./finance";

export interface FinanceSeedBundle {
  schedules: PaymentScheduleItem[];
  payments: FinancePayment[];
  adjustments: PaymentAdjustment[];
  commissions: CommissionRecord[];
  rules: CommissionRule[];
}

function pickBookings(bookings: Booking[], projectId: string, n: number): Booking[] {
  const list = bookings.filter((b) => b.projectId === projectId && b.stage !== "Cancelled");
  if (list.length >= n) return list.slice(0, n);
  return bookings.filter((b) => b.stage !== "Cancelled").slice(0, n);
}

function methodFor(n: number): PaymentMethod {
  const m: PaymentMethod[] = ["upi", "bank_transfer", "cash", "cheque", "card", "other"];
  return m[(n - 1) % m.length]!;
}

function receipt(paidAt: string, seq: number): string {
  return `BH-RCP-${paidAt.replace(/-/g, "")}-${String(seq).padStart(4, "0")}`;
}

export function buildFinanceDemoSeed(
  bookings: Booking[],
  projectId: string,
  today: Date = new Date(),
): FinanceSeedBundle {
  const todayStr = isoDateOnly(today);
  const selected = pickBookings(bookings, projectId, 5);
  const schedules: PaymentScheduleItem[] = [];
  const payments: FinancePayment[] = [];
  const adjustments: PaymentAdjustment[] = [];
  const commissions: CommissionRecord[] = [];
  const rules: CommissionRule[] = [
    {
      id: `CRULE-${projectId}`,
      projectId,
      name: "Standard agent commission",
      rate: 0.02,
      active: true,
    },
  ];

  if (selected.length === 0) {
    return { schedules, payments, adjustments, commissions, rules };
  }

  // 0: fully paid + commission PAID
  {
    const b = selected[0]!;
    let sch = createDefaultScheduleForBooking(b, { now: today, prefix: `SCH-DEMO-${b.id}` });
    sch = sch.map((s, i) => ({ ...s, dueDate: addDaysIso(todayStr, -60 + i * 20) }));
    let paySeq = 1;
    sch = sch.map((s) => {
      const pid = `FPAY-DEMO-${b.id}-${paySeq}`;
      payments.push({
        id: pid,
        paymentId: pid,
        bookingId: b.id,
        customerId: b.customerId,
        projectId: b.projectId,
        plotId: b.plotId,
        amount: s.amountDue,
        paidAt: s.dueDate,
        method: methodFor(paySeq),
        txnRef: `TXN-FULL-${b.id}-${paySeq}`,
        receiptNumber: receipt(s.dueDate, paySeq),
        recordedBy: "admin@bhairava.com",
        reconciliationStatus: "RECONCILED",
        scheduleItemId: s.id,
        createdAt: s.dueDate,
        notes: "Demo: fully paid installment",
      });
      const linked = linkPaymentToSchedule(s, pid);
      paySeq++;
      return linked;
    });
    schedules.push(...sch);
    const com = earnCommissionFromBooking(b, 0.02, {
      id: `COM-DEMO-${b.id}`,
      ruleId: rules[0]!.id,
      status: "PAID",
    });
    com.approvedAt = addDaysIso(todayStr, -10);
    com.paidAt = addDaysIso(todayStr, -5);
    commissions.push(com);
  }

  // 1: partial + commission PENDING
  if (selected[1]) {
    const b = selected[1]!;
    let sch = createDefaultScheduleForBooking(b, { now: today, prefix: `SCH-DEMO-${b.id}` });
    sch = [
      { ...sch[0]!, dueDate: addDaysIso(todayStr, -45) },
      { ...sch[1]!, dueDate: addDaysIso(todayStr, -5) },
      { ...sch[2]!, dueDate: addDaysIso(todayStr, 40) },
    ];
    const p1 = `FPAY-DEMO-${b.id}-1`;
    payments.push({
      id: p1,
      paymentId: p1,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: sch[0]!.amountDue,
      paidAt: sch[0]!.dueDate,
      method: "upi",
      txnRef: `TXN-PART-${b.id}-1`,
      receiptNumber: receipt(sch[0]!.dueDate, 1),
      recordedBy: "admin@bhairava.com",
      reconciliationStatus: "RECONCILED",
      scheduleItemId: sch[0]!.id,
      createdAt: sch[0]!.dueDate,
    });
    sch[0] = linkPaymentToSchedule(sch[0]!, p1);

    const partialAmt = Math.round(sch[1]!.amountDue * 0.4);
    const p2 = `FPAY-DEMO-${b.id}-2`;
    payments.push({
      id: p2,
      paymentId: p2,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: partialAmt,
      paidAt: addDaysIso(todayStr, -2),
      method: "bank_transfer",
      txnRef: `TXN-PART-${b.id}-2`,
      receiptNumber: receipt(todayStr, 2),
      recordedBy: "admin@bhairava.com",
      reconciliationStatus: "UNRECONCILED",
      scheduleItemId: sch[1]!.id,
      createdAt: addDaysIso(todayStr, -2),
      notes: "Demo: partial payment on installment 2",
    });
    sch[1] = linkPaymentToSchedule(sch[1]!, p2);
    schedules.push(...sch);
    commissions.push(
      earnCommissionFromBooking(b, 0.02, {
        id: `COM-DEMO-${b.id}`,
        ruleId: rules[0]!.id,
        status: "PENDING",
      }),
    );
  }

  // 2: overdue
  if (selected[2]) {
    const b = selected[2]!;
    let sch = createDefaultScheduleForBooking(b, { now: today, prefix: `SCH-DEMO-${b.id}` });
    sch = [
      { ...sch[0]!, dueDate: addDaysIso(todayStr, -90) },
      { ...sch[1]!, dueDate: addDaysIso(todayStr, -20), notes: "Demo: overdue — unpaid" },
      { ...sch[2]!, dueDate: addDaysIso(todayStr, 60) },
    ];
    const p1 = `FPAY-DEMO-${b.id}-1`;
    payments.push({
      id: p1,
      paymentId: p1,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: sch[0]!.amountDue,
      paidAt: sch[0]!.dueDate,
      method: "cheque",
      txnRef: `TXN-OD-${b.id}-1`,
      receiptNumber: receipt(sch[0]!.dueDate, 3),
      recordedBy: "admin@bhairava.com",
      reconciliationStatus: "RECONCILED",
      scheduleItemId: sch[0]!.id,
      createdAt: sch[0]!.dueDate,
    });
    sch[0] = linkPaymentToSchedule(sch[0]!, p1);
    schedules.push(...sch);
    commissions.push(
      earnCommissionFromBooking(b, 0.02, {
        id: `COM-DEMO-${b.id}`,
        ruleId: rules[0]!.id,
        status: "EARNED",
      }),
    );
  }

  // 3: upcoming + adjustment
  if (selected[3]) {
    const b = selected[3]!;
    let sch = createDefaultScheduleForBooking(b, { now: today, prefix: `SCH-DEMO-${b.id}` });
    sch = sch.map((s, i) => ({ ...s, dueDate: addDaysIso(todayStr, 14 + i * 30) }));
    const pAdj = `FPAY-DEMO-${b.id}-ADJ`;
    const originalAmt = 50000;
    payments.push({
      id: pAdj,
      paymentId: pAdj,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: 45000,
      paidAt: addDaysIso(todayStr, -3),
      method: "cash",
      txnRef: `TXN-ADJ-${b.id}`,
      receiptNumber: receipt(addDaysIso(todayStr, -3), 4),
      recordedBy: "admin@bhairava.com",
      reconciliationStatus: "ADJUSTED",
      scheduleItemId: sch[0]!.id,
      createdAt: addDaysIso(todayStr, -3),
      notes: "Demo: adjusted after mismatch",
    });
    sch[0] = linkPaymentToSchedule(sch[0]!, pAdj);
    adjustments.push({
      id: `PADJ-DEMO-${b.id}-1`,
      paymentId: pAdj,
      reason: "Cash count mismatch — corrected to actual received",
      actorId: "admin@bhairava.com",
      timestamp: new Date(today.getTime() - 2 * 86400000).toISOString(),
      previousAmount: originalAmt,
      adjustedAmount: 45000,
      kind: "ADJUST",
    });
    schedules.push(...sch);
    const com = earnCommissionFromBooking(b, 0.02, {
      id: `COM-DEMO-${b.id}`,
      ruleId: rules[0]!.id,
      status: "APPROVED",
    });
    com.approvedAt = addDaysIso(todayStr, -1);
    commissions.push(com);
  }

  // 4: reversal
  if (selected[4]) {
    const b = selected[4]!;
    let sch = createDefaultScheduleForBooking(b, { now: today, prefix: `SCH-DEMO-${b.id}` });
    sch = sch.map((s, i) => ({ ...s, dueDate: addDaysIso(todayStr, -30 + i * 25) }));
    const pRev = `FPAY-DEMO-${b.id}-REV`;
    payments.push({
      id: pRev,
      paymentId: pRev,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: sch[0]!.amountDue,
      paidAt: sch[0]!.dueDate,
      method: "other",
      txnRef: `TXN-REV-${b.id}`,
      receiptNumber: receipt(sch[0]!.dueDate, 5),
      recordedBy: "admin@bhairava.com",
      reconciliationStatus: "REVERSED",
      reversed: true,
      scheduleItemId: sch[0]!.id,
      createdAt: sch[0]!.dueDate,
      notes: "Demo: reversed — duplicate entry",
    });
    sch[0] = linkPaymentToSchedule(sch[0]!, pRev);
    adjustments.push({
      id: `PADJ-DEMO-${b.id}-REV`,
      paymentId: pRev,
      reason: "Duplicate payment entry — reversed",
      actorId: "admin@bhairava.com",
      timestamp: new Date(today.getTime() - 1 * 86400000).toISOString(),
      previousAmount: sch[0]!.amountDue,
      adjustedAmount: 0,
      kind: "REVERSE",
    });
    schedules.push(...sch);
  }

  return { schedules, payments, adjustments, commissions, rules };
}

/** Merge seed into persisted arrays without wiping user-created rows (existing wins). */
export function mergeFinanceSeed(
  existing: FinanceSeedBundle,
  seed: FinanceSeedBundle,
): FinanceSeedBundle {
  const merge = <T extends { id: string }>(a: T[], b: T[]): T[] => {
    const map = new Map<string, T>();
    for (const x of b) map.set(x.id, x);
    for (const x of a) map.set(x.id, x);
    return Array.from(map.values());
  };
  return {
    schedules: merge(existing.schedules, seed.schedules),
    payments: merge(existing.payments, seed.payments),
    adjustments: merge(existing.adjustments, seed.adjustments),
    commissions: merge(existing.commissions, seed.commissions),
    rules: merge(existing.rules, seed.rules),
  };
}
