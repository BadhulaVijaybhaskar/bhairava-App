/**
 * P4 Finance domain — payment schedules, payments, reconciliation,
 * collections (derived), receipts, commissions. Metrics derived only;
 * never invent totals. Agent scoped to own assigned customers / own commission.
 */
import type { Booking, Payment } from "@/lib/mock-data";
import { normalizeRole, type AppRole } from "./project-permissions";

export type FinanceAccess = "full" | "operate" | "own" | "read" | "denied";

export function financeAccessForRole(role: unknown): FinanceAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance") return "operate";
  if (r === "Agent" || r === "Sales") return "own";
  if (r === "Viewer") return "read";
  return "denied";
}

export function canViewFinance(role: unknown): boolean {
  return financeAccessForRole(role) !== "denied";
}

export function canOperateFinance(role: unknown): boolean {
  const a = financeAccessForRole(role);
  return a === "full" || a === "operate";
}

export function canReconcileFinance(role: unknown): boolean {
  return canOperateFinance(role);
}

export function canConfigureCommissions(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator" || r === "Finance";
}

export function canApproveCommission(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator";
}

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "card"
  | "other";

export type InstallmentStatus =
  | "UPCOMING"
  | "DUE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "WAIVED";

export type ReconciliationStatus =
  | "UNRECONCILED"
  | "RECONCILED"
  | "MISMATCH"
  | "REVERSED"
  | "ADJUSTED";

export type CommissionStatus = "PENDING" | "EARNED" | "APPROVED" | "PAID";

export interface PaymentScheduleItem {
  id: string;
  bookingId: string;
  projectId: string;
  customerId: string;
  plotId: string;
  installmentNumber: number;
  name: string;
  dueDate: string;
  amountDue: number;
  /** Linked payment ids — amountPaid derived from active (non-reversed) payments */
  paymentIds: string[];
  notes?: string;
  waived?: boolean;
}

export interface FinancePayment {
  id: string;
  paymentId: string;
  bookingId: string;
  customerId: string;
  projectId: string;
  plotId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  txnRef: string;
  receiptNumber: string;
  recordedBy: string;
  reconciliationStatus: ReconciliationStatus;
  notes?: string;
  scheduleItemId?: string;
  /** Soft-void — no hard-delete */
  reversed?: boolean;
  createdAt: string;
}

export interface PaymentAdjustment {
  id: string;
  paymentId: string;
  reason: string;
  actorId: string;
  timestamp: string;
  previousAmount: number;
  adjustedAmount: number;
  kind: "ADJUST" | "REVERSE" | "MISMATCH_FLAG";
}

export interface CommissionRule {
  id: string;
  projectId: string;
  name: string;
  rate: number;
  active: boolean;
}

export interface CommissionRecord {
  id: string;
  agentId: string;
  bookingId: string;
  projectId: string;
  plotId: string;
  saleAmount: number;
  ruleId?: string;
  ruleRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  earnedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  upi: "UPI",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  UPCOMING: "Upcoming",
  DUE: "Due",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
};

export const RECON_STATUS_LABEL: Record<ReconciliationStatus, string> = {
  UNRECONCILED: "Unreconciled",
  RECONCILED: "Reconciled",
  MISMATCH: "Mismatch",
  REVERSED: "Reversed",
  ADJUSTED: "Adjusted",
};

export const COMMISSION_STATUS_LABEL: Record<CommissionStatus, string> = {
  PENDING: "Pending",
  EARNED: "Earned",
  APPROVED: "Approved",
  PAID: "Paid",
};

export const DEFAULT_COMMISSION_RATE = 0.02;

export function toPaymentMethod(raw: unknown): PaymentMethod {
  if (typeof raw !== "string") return "other";
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (k === "cash") return "cash";
  if (k === "upi") return "upi";
  if (k === "cheque" || k === "check") return "cheque";
  if (k === "card") return "card";
  if (k === "neft" || k === "rtgs" || k === "bank_transfer" || k === "bank" || k === "transfer")
    return "bank_transfer";
  return "other";
}

export function isoDateOnly(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 0, (m || 1) - 1, d || 1);
}

export function addDaysIso(from: string, days: number): string {
  const d = parseDateOnly(from);
  d.setDate(d.getDate() + days);
  return isoDateOnly(d);
}

export function activePaymentAmount(p: FinancePayment): number {
  if (p.reversed) return 0;
  if (p.reconciliationStatus === "REVERSED") return 0;
  return p.amount;
}

export function sumActivePayments(payments: FinancePayment[], ids?: string[]): number {
  const set = ids ? new Set(ids) : null;
  return payments
    .filter((p) => (!set || set.has(p.id) || set.has(p.paymentId)) && !p.reversed)
    .reduce((s, p) => s + activePaymentAmount(p), 0);
}

/**
 * Derive installment status from dates + amounts — never fake.
 * WAIVED only when explicitly flagged.
 */
export function deriveInstallmentStatus(
  item: Pick<PaymentScheduleItem, "dueDate" | "amountDue" | "waived"> & { amountPaid: number },
  today: Date = new Date(),
): InstallmentStatus {
  if (item.waived) return "WAIVED";
  const due = item.amountDue;
  const paid = Math.max(0, item.amountPaid);
  const eps = 0.5;
  if (paid >= due - eps && due > 0) return "PAID";
  if (paid > eps && paid < due - eps) return "PARTIALLY_PAID";
  const todayOnly = parseDateOnly(isoDateOnly(today));
  const dueDate = parseDateOnly(item.dueDate);
  if (dueDate.getTime() < todayOnly.getTime()) return "OVERDUE";
  if (dueDate.getTime() === todayOnly.getTime()) return "DUE";
  return "UPCOMING";
}

export function hydrateScheduleItem(
  item: PaymentScheduleItem,
  payments: FinancePayment[],
  today: Date = new Date(),
): PaymentScheduleItem & { amountPaid: number; balance: number; status: InstallmentStatus } {
  const amountPaid = sumActivePayments(payments, item.paymentIds);
  const balance = Math.max(0, item.amountDue - amountPaid);
  const status = deriveInstallmentStatus({ ...item, amountPaid }, today);
  return { ...item, amountPaid, balance, status };
}

export function bookingOutstanding(
  booking: Pick<Booking, "amount" | "paid" | "finalAgreedAmount" | "totalPlotPrice">,
): number {
  const total = booking.finalAgreedAmount ?? booking.totalPlotPrice ?? booking.amount ?? 0;
  return Math.max(0, total - (booking.paid || 0));
}

export interface CollectionsSummary {
  collectedThisMonth: number;
  dueThisWeek: number;
  overdue: number;
  upcoming30d: number;
  outstanding: number;
  progressVsTarget: number | null;
  target: number | null;
  paymentCount: number;
  scheduleCount: number;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const toSun = day === 0 ? 0 : 7 - day;
  x.setDate(x.getDate() + toSun);
  return x;
}

export function deriveFinanceCollectionsSummary(input: {
  schedules: PaymentScheduleItem[];
  payments: FinancePayment[];
  bookings: Booking[];
  today?: Date;
  /** Optional collection target — null → progress unavailable */
  target?: number | null;
}): CollectionsSummary {
  const today = input.today ?? new Date();
  const todayStr = isoDateOnly(today);
  const monthStart = isoDateOnly(startOfMonth(today));
  const weekEnd = isoDateOnly(endOfWeek(today));
  const upcomingEnd = addDaysIso(todayStr, 30);

  const activePayments = input.payments.filter(
    (p) => !p.reversed && p.reconciliationStatus !== "REVERSED",
  );
  const collectedThisMonth = activePayments
    .filter((p) => p.paidAt >= monthStart && p.paidAt <= todayStr)
    .reduce((s, p) => s + p.amount, 0);

  let dueThisWeek = 0;
  let overdue = 0;
  let upcoming30d = 0;

  for (const raw of input.schedules) {
    const item = hydrateScheduleItem(raw, input.payments, today);
    if (item.status === "WAIVED" || item.status === "PAID") continue;
    const bal = item.balance;
    if (item.status === "OVERDUE") {
      overdue += bal;
    } else if (item.dueDate >= todayStr && item.dueDate <= weekEnd) {
      dueThisWeek += bal;
    }
    if (item.dueDate > todayStr && item.dueDate <= upcomingEnd && item.status !== "OVERDUE") {
      upcoming30d += bal;
    }
  }

  const outstanding = input.bookings.reduce((s, b) => s + bookingOutstanding(b), 0);
  const target = input.target == null || Number.isNaN(input.target) ? null : input.target;
  const progressVsTarget =
    target != null && target > 0 ? Math.round((collectedThisMonth / target) * 1000) / 10 : null;

  return {
    collectedThisMonth,
    dueThisWeek,
    overdue,
    upcoming30d,
    outstanding,
    progressVsTarget,
    target,
    paymentCount: activePayments.length,
    scheduleCount: input.schedules.length,
  };
}

export interface FinanceDashboardSummary {
  collectionsTotal: number | null;
  collectionsCount: number;
  pendingAmount: number | null;
  receiptsCount: number;
  commissionsTotal: number | null;
  bookingsWithPayments: number;
  overdueAmount: number | null;
  unavailableReason?: string;
}

export function deriveProjectFinanceSummary(input: {
  projectId: string;
  bookings: Booking[];
  payments: Payment[] | FinancePayment[];
  role: unknown;
  agentId?: string | null;
  schedules?: PaymentScheduleItem[];
  financePayments?: FinancePayment[];
  today?: Date;
}): FinanceDashboardSummary {
  const access = financeAccessForRole(input.role);
  let bookings = input.bookings.filter((b) => b.projectId === input.projectId);
  if (access === "own" && input.agentId) {
    bookings = bookings.filter((b) => b.agentId === input.agentId);
  }
  const bookingIds = new Set(bookings.map((b) => b.id));

  const fp = input.financePayments?.filter((p) => bookingIds.has(p.bookingId)) ?? [];

  if (fp.length > 0) {
    const active = fp.filter((p) => !p.reversed && p.reconciliationStatus !== "REVERSED");
    const collectionsTotal = active.reduce((s, p) => s + p.amount, 0);
    const schedules = (input.schedules ?? []).filter((s) => bookingIds.has(s.bookingId));
    const coll = deriveFinanceCollectionsSummary({
      schedules,
      payments: fp,
      bookings,
      ...(input.today ? { today: input.today } : {}),
    });
    const commissionsTotal =
      access === "denied"
        ? null
        : Math.round(bookings.reduce((s, b) => s + (b.paid || 0), 0) * DEFAULT_COMMISSION_RATE);
    return {
      collectionsTotal,
      collectionsCount: active.length,
      pendingAmount: coll.dueThisWeek + coll.overdue,
      receiptsCount: active.filter((p) => p.receiptNumber).length,
      commissionsTotal,
      bookingsWithPayments: new Set(active.map((p) => p.bookingId)).size,
      overdueAmount: coll.overdue,
    };
  }

  let payments = (input.payments as Payment[]).filter((p) => bookingIds.has(p.bookingId));
  if (access === "own" && input.agentId) {
    const custOk = new Set(bookings.map((b) => b.customerId));
    payments = payments.filter((p) => custOk.has(p.customerId));
  }

  if (payments.length === 0 && bookings.length === 0) {
    return {
      collectionsTotal: null,
      collectionsCount: 0,
      pendingAmount: null,
      receiptsCount: 0,
      commissionsTotal: null,
      bookingsWithPayments: 0,
      overdueAmount: null,
      unavailableReason: "No payment records for this project scope yet",
    };
  }

  const succeeded = payments.filter((p) => p.status === "Succeeded");
  const pending = payments.filter((p) => p.status === "Pending");
  const collectionsTotal = succeeded.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = pending.reduce((s, p) => s + p.amount, 0);
  const commissionsTotal =
    access === "denied"
      ? null
      : Math.round(bookings.reduce((s, b) => s + (b.paid || 0), 0) * DEFAULT_COMMISSION_RATE);

  return {
    collectionsTotal,
    collectionsCount: succeeded.length,
    pendingAmount,
    receiptsCount: succeeded.length,
    commissionsTotal,
    bookingsWithPayments: new Set(payments.map((p) => p.bookingId)).size,
    overdueAmount: null,
  };
}

export function filterBookingsForFinanceRole(
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): Booking[] {
  const access = financeAccessForRole(opts.role);
  let list = bookings.filter((b) => b.projectId === opts.projectId);
  if (access === "own" && opts.agentId) {
    list = list.filter((b) => b.agentId === opts.agentId);
  }
  return list;
}

export function filterPaymentsForFinanceRole(
  payments: Payment[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): Payment[] {
  const scoped = filterBookingsForFinanceRole(bookings, opts);
  const ids = new Set(scoped.map((b) => b.id));
  return payments.filter((p) => ids.has(p.bookingId));
}

export function filterFinancePaymentsForRole(
  payments: FinancePayment[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): FinancePayment[] {
  const scoped = filterBookingsForFinanceRole(bookings, opts);
  const ids = new Set(scoped.map((b) => b.id));
  return payments.filter((p) => ids.has(p.bookingId));
}

export function filterSchedulesForRole(
  schedules: PaymentScheduleItem[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): PaymentScheduleItem[] {
  const scoped = filterBookingsForFinanceRole(bookings, opts);
  const ids = new Set(scoped.map((b) => b.id));
  return schedules.filter((s) => ids.has(s.bookingId) && s.projectId === opts.projectId);
}

export function filterCommissionsForRole(
  commissions: CommissionRecord[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): CommissionRecord[] {
  const access = financeAccessForRole(opts.role);
  if (access === "denied") return [];
  let list = commissions.filter((c) => c.projectId === opts.projectId);
  if (access === "own" && opts.agentId) {
    list = list.filter((c) => c.agentId === opts.agentId);
  }
  return list;
}

export function linkPaymentToSchedule(
  schedule: PaymentScheduleItem,
  paymentId: string,
): PaymentScheduleItem {
  if (schedule.paymentIds.includes(paymentId)) return schedule;
  return { ...schedule, paymentIds: [...schedule.paymentIds, paymentId] };
}

export function recordPaymentOntoBooking(booking: Booking, amount: number): Booking {
  return { ...booking, paid: Math.round(((booking.paid || 0) + amount) * 100) / 100 };
}

export function applyPaymentAdjustment(
  payment: FinancePayment,
  adj: Omit<PaymentAdjustment, "id" | "paymentId" | "previousAmount"> & {
    id: string;
    previousAmount?: number;
  },
): { payment: FinancePayment; adjustment: PaymentAdjustment } {
  const previousAmount = adj.previousAmount ?? payment.amount;
  const adjustment: PaymentAdjustment = {
    id: adj.id,
    paymentId: payment.id,
    reason: adj.reason,
    actorId: adj.actorId,
    timestamp: adj.timestamp,
    previousAmount,
    adjustedAmount: adj.adjustedAmount,
    kind: adj.kind,
  };
  let next: FinancePayment = { ...payment };
  if (adj.kind === "REVERSE") {
    next = {
      ...next,
      reversed: true,
      reconciliationStatus: "REVERSED",
      amount: previousAmount,
    };
  } else if (adj.kind === "MISMATCH_FLAG") {
    next = { ...next, reconciliationStatus: "MISMATCH" };
  } else {
    next = {
      ...next,
      amount: adj.adjustedAmount,
      reconciliationStatus: "ADJUSTED",
    };
  }
  return { payment: next, adjustment };
}

export function reconcilePayment(payment: FinancePayment, ok: boolean): FinancePayment {
  if (payment.reversed || payment.reconciliationStatus === "REVERSED") return payment;
  return {
    ...payment,
    reconciliationStatus: ok ? "RECONCILED" : "MISMATCH",
  };
}

export function handleOverpayment(
  scheduleAmountDue: number,
  amountPaidSoFar: number,
  newPaymentAmount: number,
): { appliedToInstallment: number; excess: number } {
  const remaining = Math.max(0, scheduleAmountDue - amountPaidSoFar);
  const appliedToInstallment = Math.min(remaining, newPaymentAmount);
  const excess = Math.max(0, newPaymentAmount - appliedToInstallment);
  return { appliedToInstallment, excess };
}

export function createDefaultScheduleForBooking(
  booking: Booking,
  opts?: { now?: Date; prefix?: string },
): PaymentScheduleItem[] {
  const now = opts?.now ?? new Date();
  const today = isoDateOnly(now);
  const total = booking.finalAgreedAmount ?? booking.totalPlotPrice ?? booking.amount;
  const bookingAmt = Math.round(total * 0.2);
  const mid = Math.round(total * 0.3);
  const final = total - bookingAmt - mid;
  const prefix = opts?.prefix ?? `SCH-${booking.id}`;
  return [
    {
      id: `${prefix}-1`,
      bookingId: booking.id,
      projectId: booking.projectId,
      customerId: booking.customerId,
      plotId: booking.plotId,
      installmentNumber: 1,
      name: "Booking advance",
      dueDate: booking.date?.slice(0, 10) || today,
      amountDue: bookingAmt,
      paymentIds: [],
    },
    {
      id: `${prefix}-2`,
      bookingId: booking.id,
      projectId: booking.projectId,
      customerId: booking.customerId,
      plotId: booking.plotId,
      installmentNumber: 2,
      name: "Agreement installment",
      dueDate: addDaysIso(booking.date?.slice(0, 10) || today, 30),
      amountDue: mid,
      paymentIds: [],
    },
    {
      id: `${prefix}-3`,
      bookingId: booking.id,
      projectId: booking.projectId,
      customerId: booking.customerId,
      plotId: booking.plotId,
      installmentNumber: 3,
      name: "Final / registration",
      dueDate: addDaysIso(booking.date?.slice(0, 10) || today, 90),
      amountDue: final,
      paymentIds: [],
    },
  ];
}

export function earnCommissionFromBooking(
  booking: Booking,
  rate: number,
  opts: { id: string; ruleId?: string; status?: CommissionStatus },
): CommissionRecord {
  const saleAmount = booking.finalAgreedAmount ?? booking.totalPlotPrice ?? booking.amount;
  const commissionAmount = Math.round(saleAmount * rate);
  return {
    id: opts.id,
    agentId: booking.agentId,
    bookingId: booking.id,
    projectId: booking.projectId,
    plotId: booking.plotId,
    saleAmount,
    ...(opts.ruleId ? { ruleId: opts.ruleId } : {}),
    ruleRate: rate,
    commissionAmount,
    status: opts.status ?? "EARNED",
    earnedAt: isoDateOnly(),
  };
}

export function newReceiptNumber(seq: number, paidAt: string): string {
  const ymd = paidAt.replace(/-/g, "").slice(0, 8);
  return `BH-RCP-${ymd}-${String(seq).padStart(4, "0")}`;
}

/** Convert legacy mock Payment → FinancePayment (project/plot filled from booking when available) */
export function legacyPaymentToFinance(
  p: Payment,
  booking?: Booking | null,
  recordedBy = "system@seed",
): FinancePayment {
  return {
    id: p.id,
    paymentId: p.id,
    bookingId: p.bookingId,
    customerId: p.customerId,
    projectId: booking?.projectId ?? "",
    plotId: booking?.plotId ?? "",
    amount: p.amount,
    paidAt: p.date,
    method: toPaymentMethod(p.mode),
    txnRef: p.reference,
    receiptNumber: `BH-RCP-LEGACY-${p.id}`,
    recordedBy,
    reconciliationStatus: p.status === "Succeeded" ? "RECONCILED" : "UNRECONCILED",
    reversed: p.status === "Refunded",
    createdAt: p.date,
    ...(p.status === "Failed" ? { notes: "Legacy failed payment" } : {}),
  };
}

/** @deprecated use deriveProjectFinanceSummary */
export const deriveProjectFinanceDashboard = deriveProjectFinanceSummary;

export type { AppRole };

