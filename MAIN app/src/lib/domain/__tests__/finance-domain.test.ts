import { describe, expect, it } from "vitest";
import type { Booking, Payment } from "@/lib/mock-data";
import {
  applyPaymentAdjustment,
  createDefaultScheduleForBooking,
  deriveInstallmentStatus,
  deriveFinanceCollectionsSummary,
  deriveProjectFinanceSummary,
  filterCommissionsForRole,
  filterFinancePaymentsForRole,
  filterPaymentsForFinanceRole,
  financeAccessForRole,
  handleOverpayment,
  hydrateScheduleItem,
  linkPaymentToSchedule,
  reconcilePayment,
  recordPaymentOntoBooking,
  type CommissionRecord,
  type FinancePayment,
  type PaymentScheduleItem,
} from "../finance";
import { buildFinanceDemoSeed } from "../finance-seed";

const booking = (over: Partial<Booking> & Pick<Booking, "id" | "agentId" | "customerId">): Booking => ({
  plotId: "PLT-1",
  projectId: "PRJ-01",
  amount: 1_000_000,
  paid: 0,
  date: "2026-09-01",
  stage: "Confirmed",
  ...over,
});

describe("finance permissions", () => {
  it("matrix: Founder/Admin full; Finance operate; Agent own; Viewer read; Customer denied", () => {
    expect(financeAccessForRole("Founder")).toBe("full");
    expect(financeAccessForRole("Administrator")).toBe("full");
    expect(financeAccessForRole("Finance")).toBe("operate");
    expect(financeAccessForRole("Agent")).toBe("own");
    expect(financeAccessForRole("Viewer")).toBe("read");
    expect(financeAccessForRole("Customer")).toBe("denied");
  });
});

describe("installment status derivation", () => {
  const today = new Date("2026-09-24T12:00:00");

  it("PAID when amountPaid covers amountDue", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-09-01", amountDue: 100, amountPaid: 100 },
        today,
      ),
    ).toBe("PAID");
  });

  it("PARTIALLY_PAID when some but not all paid", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-09-01", amountDue: 100, amountPaid: 40 },
        today,
      ),
    ).toBe("PARTIALLY_PAID");
  });

  it("OVERDUE when past due and unpaid", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-09-01", amountDue: 100, amountPaid: 0 },
        today,
      ),
    ).toBe("OVERDUE");
  });

  it("DUE on due date", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-09-24", amountDue: 100, amountPaid: 0 },
        today,
      ),
    ).toBe("DUE");
  });

  it("UPCOMING when future due", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-10-01", amountDue: 100, amountPaid: 0 },
        today,
      ),
    ).toBe("UPCOMING");
  });

  it("WAIVED only when explicitly flagged", () => {
    expect(
      deriveInstallmentStatus(
        { dueDate: "2026-09-01", amountDue: 100, amountPaid: 0, waived: true },
        today,
      ),
    ).toBe("WAIVED");
  });
});

describe("payments + schedule + booking link", () => {
  it("links payment, updates booking paid, derives balance", () => {
    const b = booking({ id: "B1", agentId: "A1", customerId: "C1", paid: 0 });
    const sch = createDefaultScheduleForBooking(b)[0]!;
    const pay: FinancePayment = {
      id: "P1",
      paymentId: "P1",
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: 50_000,
      paidAt: "2026-09-10",
      method: "upi",
      txnRef: "TX1",
      receiptNumber: "BH-RCP-1",
      recordedBy: "admin",
      reconciliationStatus: "UNRECONCILED",
      scheduleItemId: sch.id,
      createdAt: "2026-09-10",
    };
    const linked = linkPaymentToSchedule(sch, pay.id);
    expect(linked.paymentIds).toContain("P1");
    const hydrated = hydrateScheduleItem(linked, [pay], new Date("2026-09-24"));
    expect(hydrated.amountPaid).toBe(50_000);
    expect(hydrated.balance).toBe(sch.amountDue - 50_000);
    const updated = recordPaymentOntoBooking(b, pay.amount);
    expect(updated.paid).toBe(50_000);
  });

  it("handles overpayment without inventing installment coverage", () => {
    const r = handleOverpayment(100_000, 80_000, 50_000);
    expect(r.appliedToInstallment).toBe(20_000);
    expect(r.excess).toBe(30_000);
  });

  it("reconcile and adjust preserve audit (no silent overwrite)", () => {
    const pay: FinancePayment = {
      id: "P2",
      paymentId: "P2",
      bookingId: "B1",
      customerId: "C1",
      projectId: "PRJ-01",
      plotId: "PLT-1",
      amount: 10_000,
      paidAt: "2026-09-10",
      method: "cash",
      txnRef: "TX2",
      receiptNumber: "R2",
      recordedBy: "admin",
      reconciliationStatus: "UNRECONCILED",
      createdAt: "2026-09-10",
    };
    const reconciled = reconcilePayment(pay, true);
    expect(reconciled.reconciliationStatus).toBe("RECONCILED");
    expect(reconciled.amount).toBe(10_000);

    const { payment: adjusted, adjustment } = applyPaymentAdjustment(reconciled, {
      id: "ADJ1",
      reason: "Cash count fix",
      actorId: "admin",
      timestamp: "2026-09-11T10:00:00.000Z",
      adjustedAmount: 9_500,
      kind: "ADJUST",
    });
    expect(adjustment.previousAmount).toBe(10_000);
    expect(adjustment.adjustedAmount).toBe(9_500);
    expect(adjusted.amount).toBe(9_500);
    expect(adjusted.reconciliationStatus).toBe("ADJUSTED");

    const { payment: reversed } = applyPaymentAdjustment(pay, {
      id: "ADJ2",
      reason: "Duplicate",
      actorId: "admin",
      timestamp: "2026-09-11T11:00:00.000Z",
      adjustedAmount: 0,
      kind: "REVERSE",
    });
    expect(reversed.reversed).toBe(true);
    expect(reversed.reconciliationStatus).toBe("REVERSED");
  });
});

describe("role scoping / PII", () => {
  const bookings: Booking[] = [
    booking({ id: "B1", agentId: "brag0001", customerId: "C1", paid: 100_000 }),
    booking({ id: "B2", agentId: "brag0002", customerId: "C2", paid: 200_000 }),
  ];
  const payments: Payment[] = [
    {
      id: "PAY1",
      bookingId: "B1",
      customerId: "C1",
      amount: 50_000,
      mode: "UPI",
      reference: "R1",
      date: "2026-09-01",
      status: "Succeeded",
    },
    {
      id: "PAY2",
      bookingId: "B2",
      customerId: "C2",
      amount: 80_000,
      mode: "NEFT",
      reference: "R2",
      date: "2026-09-02",
      status: "Pending",
    },
  ];

  it("aggregates collections without inventing metrics", () => {
    const s = deriveProjectFinanceSummary({
      projectId: "PRJ-01",
      bookings,
      payments,
      role: "Administrator",
    });
    expect(s.collectionsTotal).toBe(50_000);
    expect(s.pendingAmount).toBe(80_000);
    expect(s.receiptsCount).toBe(1);
  });

  it("scopes agent to own bookings only", () => {
    const rows = filterPaymentsForFinanceRole(payments, bookings, {
      projectId: "PRJ-01",
      role: "Agent",
      agentId: "brag0001",
    });
    expect(rows.map((r) => r.id)).toEqual(["PAY1"]);
  });

  it("agent never sees another agent commission", () => {
    const commissions: CommissionRecord[] = [
      {
        id: "COM1",
        agentId: "brag0001",
        bookingId: "B1",
        projectId: "PRJ-01",
        plotId: "PLT-1",
        saleAmount: 1_000_000,
        ruleRate: 0.02,
        commissionAmount: 20_000,
        status: "PAID",
      },
      {
        id: "COM2",
        agentId: "brag0002",
        bookingId: "B2",
        projectId: "PRJ-01",
        plotId: "PLT-2",
        saleAmount: 2_000_000,
        ruleRate: 0.02,
        commissionAmount: 40_000,
        status: "PENDING",
      },
    ];
    const own = filterCommissionsForRole(commissions, {
      projectId: "PRJ-01",
      role: "Agent",
      agentId: "brag0001",
    });
    expect(own.map((c) => c.id)).toEqual(["COM1"]);
  });
});

describe("demo seed coherence", () => {
  it("builds paid/partial/overdue/upcoming/recon/adjust/commission states", () => {
    const bookings: Booking[] = [
      booking({ id: "B1", agentId: "A1", customerId: "C1" }),
      booking({ id: "B2", agentId: "A2", customerId: "C2" }),
      booking({ id: "B3", agentId: "A1", customerId: "C3" }),
      booking({ id: "B4", agentId: "A2", customerId: "C4" }),
      booking({ id: "B5", agentId: "A1", customerId: "C5" }),
    ];
    const seed = buildFinanceDemoSeed(bookings, "PRJ-01", new Date("2026-09-24"));
    expect(seed.schedules.length).toBeGreaterThan(0);
    expect(seed.payments.length).toBeGreaterThan(0);
    expect(seed.adjustments.length).toBeGreaterThan(0);
    expect(seed.commissions.some((c) => c.status === "PAID")).toBe(true);
    expect(seed.commissions.some((c) => c.status === "PENDING")).toBe(true);
    expect(seed.payments.some((p) => p.reconciliationStatus === "RECONCILED")).toBe(true);
    expect(seed.payments.some((p) => p.reversed)).toBe(true);

    const today = new Date("2026-09-24");
    const statuses = new Set(
      seed.schedules.map((s) => hydrateScheduleItem(s, seed.payments, today).status),
    );
    expect(statuses.has("PAID") || statuses.has("PARTIALLY_PAID")).toBe(true);
    expect(statuses.has("OVERDUE") || statuses.has("UPCOMING")).toBe(true);

    const coll = deriveFinanceCollectionsSummary({
      schedules: seed.schedules,
      payments: seed.payments,
      bookings,
      today,
      target: null,
    });
    expect(coll.progressVsTarget).toBeNull();
    expect(coll.paymentCount).toBe(
      seed.payments.filter((p) => !p.reversed && p.reconciliationStatus !== "REVERSED").length,
    );
  });
});
