import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Percent,
  Plus,
  Printer,
  Scale,
} from "lucide-react";
import { Btn, Chip, Panel, SectionTitle } from "@/components/kit";
import {
  Field,
  TextInput,
  SelectInput,
  NumberInput,
  TextareaInput,
  EditSheet,
} from "@/components/form-kit";
import type { Booking, Project } from "@/lib/mock-data";
import { byId, formatINR, payments as seedPayments } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  COMMISSION_STATUS_LABEL,
  INSTALLMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  RECON_STATUS_LABEL,
  applyPaymentAdjustment,
  canOperateFinance,
  canReconcileFinance,
  canViewFinance,
  createDefaultScheduleForBooking,
  deriveFinanceCollectionsSummary,
  deriveProjectFinanceSummary,
  earnCommissionFromBooking,
  filterBookingsForFinanceRole,
  filterCommissionsForRole,
  filterFinancePaymentsForRole,
  filterSchedulesForRole,
  financeAccessForRole,
  handleOverpayment,
  hydrateScheduleItem,
  isoDateOnly,
  linkPaymentToSchedule,
  newReceiptNumber,
  reconcilePayment,
  recordPaymentOntoBooking,
  type CommissionRecord,
  type CommissionStatus,
  type FinancePayment,
  type InstallmentStatus,
  type PaymentAdjustment,
  type PaymentMethod,
  type PaymentScheduleItem,
  type ReconciliationStatus,
  type CommissionRule,
} from "@/lib/domain/finance";

const SECTIONS = [
  { key: "collections", label: "Collections", icon: LayoutDashboard },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "payments", label: "Payments", icon: Banknote },
  { key: "receipts", label: "Receipts", icon: FileText },
  { key: "reconcile", label: "Reconciliation", icon: Scale },
  { key: "commissions", label: "Commissions", icon: Percent },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];
type ChipTone = "positive" | "warning" | "danger" | "neutral" | "info";

function toneFor(status: string): ChipTone {
  if (["PAID", "RECONCILED", "APPROVED"].includes(status)) return "positive";
  if (["OVERDUE", "REVERSED", "MISMATCH"].includes(status)) return "danger";
  if (["PARTIALLY_PAID", "DUE", "PENDING", "UNRECONCILED", "EARNED"].includes(status)) return "warning";
  return "neutral";
}

type FinanceStore = {
  financePayments: FinancePayment[];
  paymentSchedules: PaymentScheduleItem[];
  paymentAdjustments: PaymentAdjustment[];
  commissions: CommissionRecord[];
  commissionRules: CommissionRule[];
  saveFinancePayment: (p: FinancePayment) => void;
  savePaymentSchedule: (s: PaymentScheduleItem) => void;
  savePaymentAdjustment: (a: PaymentAdjustment) => void;
  saveCommission: (c: CommissionRecord) => void;
  ensureFinanceSeed: (projectId: string) => void;
};

export function ProjectFinanceTab({ project }: { project: Project }) {
  const session = getSession();
  const role = session?.role;
  const access = financeAccessForRole(role);
  const canOps = canOperateFinance(role);
  const canRecon = canReconcileFinance(role);

  const store = useData() as ReturnType<typeof useData> & FinanceStore;
  const {
    bookings,
    agents,
    customers,
    plots,
    financePayments,
    paymentSchedules,
    paymentAdjustments,
    commissions,
    commissionRules,
    saveFinancePayment,
    savePaymentSchedule,
    savePaymentAdjustment,
    saveCommission,
    saveBooking,
    ensureFinanceSeed,
  } = store;

  const [section, setSection] = useState<SectionKey>("collections");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [scheduleBookingId, setScheduleBookingId] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [detailPaymentId, setDetailPaymentId] = useState<string | null>(null);

  const sessionAgentId = useMemo(() => {
    const email = (session?.email ?? "").toLowerCase();
    return agents.find((a) => (a.email ?? "").toLowerCase() === email)?.id ?? null;
  }, [agents, session?.email]);

  useEffect(() => {
    ensureFinanceSeed?.(project.id);
  }, [project.id, ensureFinanceSeed]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);

  if (!canViewFinance(role)) {
    return (
      <Panel className="text-center">
        <SectionTitle>Finance access denied</SectionTitle>
        <p className="pt-2 text-sm text-muted-foreground">
          Customer roles cannot open project Finance in MAIN.
        </p>
      </Panel>
    );
  }

  const scope = { projectId: project.id, role, agentId: sessionAgentId };
  const scopedBookings = filterBookingsForFinanceRole(bookings, scope);
  const schedules = filterSchedulesForRole(paymentSchedules ?? [], bookings, scope);
  const payments = filterFinancePaymentsForRole(financePayments ?? [], bookings, scope);
  const commissionRows = filterCommissionsForRole(commissions ?? [], scope);

  const summary = deriveProjectFinanceSummary({
    projectId: project.id,
    bookings,
    payments: seedPayments,
    role,
    agentId: sessionAgentId,
    schedules,
    financePayments: payments,
  });

  const collections = deriveFinanceCollectionsSummary({
    schedules,
    payments,
    bookings: scopedBookings,
    target: null,
  });

  const hydrated = useMemo(
    () => schedules.map((s) => hydrateScheduleItem(s, payments)),
    [schedules, payments],
  );

  const filteredSchedules = hydrated.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!q) return true;
    const cust = byId(customers, s.customerId)?.name ?? "";
    return `${s.name} ${s.bookingId} ${cust}`.toLowerCase().includes(q.toLowerCase());
  });

  const filteredPayments = payments.filter((p) => {
    if (statusFilter === "REVERSED") return !!p.reversed;
    if (statusFilter !== "all" && p.reconciliationStatus !== statusFilter) return false;
    if (!q) return true;
    const cust = byId(customers, p.customerId)?.name ?? "";
    return `${p.receiptNumber} ${p.txnRef} ${p.bookingId} ${cust}`.toLowerCase().includes(q.toLowerCase());
  });

  const receipts = payments.filter((p) => !p.reversed && p.receiptNumber);
  const bookingsNeedingSchedule = scopedBookings.filter(
    (b) => b.stage !== "Cancelled" && !schedules.some((s) => s.bookingId === b.id),
  );

  const onCreateSchedule = (bookingId: string) => {
    if (!canOps) return;
    const b = byId(bookings, bookingId);
    if (!b) return;
    if (schedules.some((s) => s.bookingId === bookingId)) {
      setFlash("Schedule already exists for this booking.");
      return;
    }
    const items = createDefaultScheduleForBooking(b);
    items.forEach((item) => savePaymentSchedule(item));
    setFlash(`Payment schedule created for ${bookingId} (${items.length} installments).`);
  };

  const onRecordPayment = (input: {
    bookingId: string;
    scheduleItemId: string;
    amount: number;
    method: PaymentMethod;
    txnRef: string;
    notes: string;
    paidAt: string;
  }) => {
    if (!canOps) return;
    const b = byId(bookings, input.bookingId);
    const sch = schedules.find((s) => s.id === input.scheduleItemId);
    if (!b || !sch) {
      setFlash("Booking or schedule item not found.");
      return;
    }
    const h = hydrateScheduleItem(sch, payments);
    const { appliedToInstallment, excess } = handleOverpayment(h.amountDue, h.amountPaid, input.amount);
    const id = `FPAY-${Date.now().toString(36).toUpperCase()}`;
    const receiptNumber = newReceiptNumber((financePayments?.length ?? 0) + 1, input.paidAt);
    const pay: FinancePayment = {
      id,
      paymentId: id,
      bookingId: b.id,
      customerId: b.customerId,
      projectId: b.projectId,
      plotId: b.plotId,
      amount: input.amount,
      paidAt: input.paidAt,
      method: input.method,
      txnRef: input.txnRef || `TXN-${id}`,
      receiptNumber,
      recordedBy: session?.email ?? "admin",
      reconciliationStatus: "UNRECONCILED",
      scheduleItemId: sch.id,
      createdAt: isoDateOnly(),
      ...(input.notes || excess > 0
        ? { notes: input.notes || `Excess ${excess} beyond installment` }
        : {}),
    };
    saveFinancePayment(pay);
    savePaymentSchedule(linkPaymentToSchedule(sch, pay.id));
    saveBooking(recordPaymentOntoBooking(b, appliedToInstallment));
    if (!commissionRows.some((c) => c.bookingId === b.id)) {
      const rule = (commissionRules ?? []).find((r) => r.projectId === project.id && r.active);
      const rate = rule?.rate ?? 0.02;
      saveCommission(
        earnCommissionFromBooking(b, rate, {
          id: `COM-${b.id}`,
          ...(rule?.id ? { ruleId: rule.id } : {}),
          status: "EARNED",
        }),
      );
    }
    setRecordOpen(false);
    setFlash(
      excess > 0
        ? `Payment recorded. Applied ${formatINR(appliedToInstallment)}; excess ${formatINR(excess)} noted.`
        : `Payment ${receiptNumber} recorded.`,
    );
    setSection("payments");
  };

  const onReconcile = (paymentId: string, ok: boolean) => {
    if (!canRecon) return;
    const p = payments.find((x) => x.id === paymentId);
    if (!p) return;
    saveFinancePayment(reconcilePayment(p, ok));
    setFlash(ok ? `Payment ${p.receiptNumber} reconciled.` : `Payment ${p.receiptNumber} flagged mismatch.`);
  };

  const onAdjust = (paymentId: string, adjustedAmount: number, reason: string, kind: "ADJUST" | "REVERSE") => {
    if (!canRecon) return;
    const p = payments.find((x) => x.id === paymentId);
    if (!p) return;
    const { payment, adjustment } = applyPaymentAdjustment(p, {
      id: `PADJ-${Date.now().toString(36).toUpperCase()}`,
      reason,
      actorId: session?.email ?? "admin",
      timestamp: new Date().toISOString(),
      adjustedAmount,
      kind,
    });
    saveFinancePayment(payment);
    savePaymentAdjustment(adjustment);
    const b = byId(bookings, p.bookingId);
    if (b) {
      if (kind === "REVERSE") saveBooking({ ...b, paid: Math.max(0, (b.paid || 0) - p.amount) });
      else {
        const delta = adjustedAmount - p.amount;
        if (delta !== 0) saveBooking({ ...b, paid: Math.max(0, (b.paid || 0) + delta) });
      }
    }
    setFlash(kind === "REVERSE" ? "Payment reversed (audit kept)." : "Payment adjusted (audit kept).");
  };

  const onCommissionStatus = (id: string, status: CommissionStatus) => {
    if (!(access === "full" || (access === "operate" && canOps))) return;
    const row = commissionRows.find((c) => c.id === id);
    if (!row) return;
    const next: CommissionRecord = { ...row, status };
    if (status === "APPROVED") next.approvedAt = isoDateOnly();
    if (status === "PAID") next.paidAt = isoDateOnly();
    saveCommission(next);
    setFlash(`Commission ${id} â†’ ${status}`);
  };

  const receiptPay = receiptId ? payments.find((p) => p.id === receiptId) ?? null : null;
  const detailPay = detailPaymentId ? payments.find((p) => p.id === detailPaymentId) ?? null : null;

  return (
    <div className="space-y-4" data-testid="finance-workspace">
      {access === "read" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Finance is read-only for Viewer.
        </div>
      )}
      {access === "own" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Agent finance view â€” own assigned customers / own commission only.
        </div>
      )}
      {flash && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" data-testid="finance-flash">
          {flash}
        </div>
      )}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle>Finance workspace</SectionTitle>
            <p className="text-sm text-muted-foreground">
              Schedules, payments, reconciliation, receipts and commissions â€” derived metrics only.
            </p>
          </div>
          {canOps && (
            <div className="flex flex-wrap gap-2">
              <Btn variant="tonal" onClick={() => setSection("schedule")} data-testid="finance-goto-schedule">
                <ClipboardCheck className="size-4" /> Schedule
              </Btn>
              <Btn variant="primary" onClick={() => setRecordOpen(true)} data-testid="finance-record-payment-btn">
                <Plus className="size-4" /> Record payment
              </Btn>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                type="button"
                data-testid={`finance-section-${s.key}`}
                onClick={() => {
                  setSection(s.key);
                  setStatusFilter("all");
                  setQ("");
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/30 text-muted-foreground hover:bg-surface-low"
                }`}
              >
                <Icon className="size-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </Panel>

      {section === "collections" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="finance-dashboard">
          <MetricCard label="Collected this month" value={collections.collectedThisMonth} />
          <MetricCard label="Due this week" value={collections.dueThisWeek} />
          <MetricCard label="Overdue" value={collections.overdue} danger={collections.overdue > 0} />
          <MetricCard label="Upcoming 30d" value={collections.upcoming30d} />
          <MetricCard label="Outstanding" value={collections.outstanding} />
          <MetricCard
            label="Progress vs target"
            value={null}
            text={collections.progressVsTarget == null ? "No target set" : `${collections.progressVsTarget}%`}
          />
          <MetricCard label="Collections (all time)" value={summary.collectionsTotal} count={summary.collectionsCount} />
          <MetricCard label="Receipts" value={null} count={summary.receiptsCount} countOnly />
          <MetricCard label="Commissions (est.)" value={summary.commissionsTotal} />
        </div>
      )}

      {section !== "collections" && section !== "commissions" && (
        <Panel className="flex flex-wrap items-end gap-3">
          <Field label="Search">
            <TextInput value={q} onChange={setQ} placeholder="Customer, booking, receipt, txnâ€¦" />
          </Field>
          <Field label="Status">
            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                ...(section === "schedule"
                  ? (Object.keys(INSTALLMENT_STATUS_LABEL) as InstallmentStatus[]).map((s) => ({
                      value: s,
                      label: INSTALLMENT_STATUS_LABEL[s],
                    }))
                  : (Object.keys(RECON_STATUS_LABEL) as ReconciliationStatus[]).map((s) => ({
                      value: s,
                      label: RECON_STATUS_LABEL[s],
                    }))),
              ]}
            />
          </Field>
        </Panel>
      )}

      {section === "schedule" && (
        <div className="space-y-3" data-testid="finance-schedule">
          {canOps && bookingsNeedingSchedule.length > 0 && (
            <Panel className="space-y-2">
              <SectionTitle>Create schedule from booking</SectionTitle>
              <div className="flex flex-wrap gap-2">
                <SelectInput
                  value={scheduleBookingId}
                  onChange={setScheduleBookingId}
                  options={[
                    { value: "", label: "Select bookingâ€¦" },
                    ...bookingsNeedingSchedule.slice(0, 40).map((b) => ({
                      value: b.id,
                      label: `${b.id} Â· ${byId(customers, b.customerId)?.name ?? b.customerId} Â· ${formatINR(b.finalAgreedAmount ?? b.amount, { compact: true })}`,
                    })),
                  ]}
                />
                <Btn
                  variant="primary"
                  disabled={!scheduleBookingId}
                  onClick={() => onCreateSchedule(scheduleBookingId)}
                  data-testid="finance-schedule-create-confirm"
                >
                  Create 3-installment schedule
                </Btn>
              </div>
            </Panel>
          )}
          <EntityTable
            empty="No payment schedules in scope."
            rows={filteredSchedules}
            columns={[
              { key: "n", header: "#", cell: (r) => r.installmentNumber },
              { key: "name", header: "Installment", cell: (r) => r.name },
              {
                key: "booking",
                header: "Booking",
                cell: (r) => (
                  <span>
                    {r.bookingId}
                    <span className="block text-xs text-muted-foreground">
                      {byId(customers, r.customerId)?.name ?? r.customerId}
                    </span>
                  </span>
                ),
              },
              { key: "due", header: "Due", cell: (r) => r.dueDate },
              { key: "dueAmt", header: "Due amt", align: "right", cell: (r) => <span className="numeric">{formatINR(r.amountDue)}</span> },
              { key: "paid", header: "Paid", align: "right", cell: (r) => <span className="numeric">{formatINR(r.amountPaid)}</span> },
              { key: "bal", header: "Balance", align: "right", cell: (r) => <span className="numeric">{formatINR(r.balance)}</span> },
              {
                key: "status",
                header: "Status",
                cell: (r) => <Chip tone={toneFor(r.status)}>{INSTALLMENT_STATUS_LABEL[r.status]}</Chip>,
              },
            ]}
          />
        </div>
      )}

      {section === "payments" && (
        <EntityTable
          empty="No payments in scope."
          rows={filteredPayments}
          onRowClick={(p) => setDetailPaymentId(p.id)}
          columns={[
            { key: "id", header: "Payment", cell: (p) => <span className="numeric text-xs">{p.id}</span> },
            { key: "cust", header: "Customer", cell: (p) => byId(customers, p.customerId)?.name ?? p.customerId },
            { key: "amt", header: "Amount", align: "right", cell: (p) => <span className="numeric">{formatINR(p.amount)}</span> },
            { key: "method", header: "Method", cell: (p) => PAYMENT_METHOD_LABEL[p.method] },
            { key: "date", header: "Paid at", cell: (p) => p.paidAt },
            {
              key: "recon",
              header: "Recon",
              cell: (p) => (
                <Chip tone={toneFor(p.reversed ? "REVERSED" : p.reconciliationStatus)}>
                  {p.reversed ? "Reversed" : RECON_STATUS_LABEL[p.reconciliationStatus]}
                </Chip>
              ),
            },
            { key: "rcp", header: "Receipt", cell: (p) => p.receiptNumber },
          ]}
        />
      )}

      {section === "receipts" && (
        <EntityTable
          empty="No receipts yet."
          rows={receipts.filter((p) => {
            if (!q) return true;
            const cust = byId(customers, p.customerId)?.name ?? "";
            return `${p.receiptNumber} ${cust} ${p.bookingId}`.toLowerCase().includes(q.toLowerCase());
          })}
          onRowClick={(p) => setReceiptId(p.id)}
          columns={[
            { key: "rcp", header: "Receipt #", cell: (p) => p.receiptNumber },
            { key: "cust", header: "Customer", cell: (p) => byId(customers, p.customerId)?.name ?? p.customerId },
            { key: "amt", header: "Amount", align: "right", cell: (p) => <span className="numeric">{formatINR(p.amount)}</span> },
            { key: "method", header: "Method", cell: (p) => PAYMENT_METHOD_LABEL[p.method] },
            { key: "date", header: "Date", cell: (p) => p.paidAt },
            {
              key: "view",
              header: "",
              cell: (p) => (
                <Btn
                  variant="tonal"
                  onClick={() => setReceiptId(p.id)}
                >
                  <Printer className="size-3.5" /> View
                </Btn>
              ),
            },
          ]}
        />
      )}

      {section === "reconcile" && (
        <div className="space-y-3" data-testid="finance-reconcile">
          <EntityTable
            empty="No payments to reconcile."
            rows={payments.filter((p) => !p.reversed)}
            columns={[
              { key: "id", header: "Payment", cell: (p) => p.id },
              { key: "amt", header: "Amount", align: "right", cell: (p) => <span className="numeric">{formatINR(p.amount)}</span> },
              {
                key: "status",
                header: "Status",
                cell: (p) => (
                  <Chip tone={toneFor(p.reconciliationStatus)}>{RECON_STATUS_LABEL[p.reconciliationStatus]}</Chip>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                cell: (p) =>
                  canRecon ? (
                    <div className="flex flex-wrap gap-1">
                      <Btn variant="tonal" onClick={() => onReconcile(p.id, true)}>Reconcile</Btn>
                      <Btn variant="tonal" onClick={() => onReconcile(p.id, false)}>Flag mismatch</Btn>
                      <Btn
                        variant="tonal"
                        onClick={() => {
                          const amt = window.prompt("Adjusted amount", String(p.amount));
                          const reason = window.prompt("Reason for adjustment");
                          if (amt && reason) onAdjust(p.id, Number(amt), reason, "ADJUST");
                        }}
                      >
                        Adjust
                      </Btn>
                      <Btn
                        variant="tonal"
                        onClick={() => {
                          const reason = window.prompt("Reason for reversal");
                          if (reason) onAdjust(p.id, 0, reason, "REVERSE");
                        }}
                      >
                        Reverse
                      </Btn>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">View only</span>
                  ),
              },
            ]}
          />
          {(paymentAdjustments ?? []).length > 0 && (
            <Panel>
              <SectionTitle>Adjustment audit</SectionTitle>
              <ul className="space-y-2 text-sm">
                {(paymentAdjustments ?? [])
                  .filter((a) => payments.some((p) => p.id === a.paymentId))
                  .slice(0, 30)
                  .map((a) => (
                    <li key={a.id} className="rounded-md border border-outline-variant/20 px-3 py-2">
                      <span className="font-medium">{a.kind}</span> Â· {a.paymentId} Â·{" "}
                      <span className="numeric">{formatINR(a.previousAmount)}</span> â†’{" "}
                      <span className="numeric">{formatINR(a.adjustedAmount)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.reason} Â· {a.actorId} Â· {a.timestamp}
                      </span>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {section === "commissions" && (
        <EntityTable
          empty="No commissions in scope."
          rows={commissionRows.filter((c) => {
            if (!q) return true;
            const agent = byId(agents, c.agentId)?.name ?? "";
            return `${c.id} ${c.bookingId} ${agent}`.toLowerCase().includes(q.toLowerCase());
          })}
          columns={[
            { key: "id", header: "ID", cell: (c) => c.id },
            { key: "agent", header: "Agent", cell: (c) => byId(agents, c.agentId)?.name ?? c.agentId },
            { key: "booking", header: "Booking", cell: (c) => c.bookingId },
            { key: "sale", header: "Sale", align: "right", cell: (c) => <span className="numeric">{formatINR(c.saleAmount)}</span> },
            { key: "rate", header: "Rate", cell: (c) => <span className="numeric">{(c.ruleRate * 100).toFixed(1)}%</span> },
            {
              key: "amt",
              header: "Commission",
              align: "right",
              cell: (c) => <span className="numeric">{formatINR(c.commissionAmount)}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (c) => <Chip tone={toneFor(c.status)}>{COMMISSION_STATUS_LABEL[c.status]}</Chip>,
            },
            {
              key: "actions",
              header: "",
              cell: (c) =>
                access === "full" || access === "operate" ? (
                  <div className="flex flex-wrap gap-1">
                    {c.status === "EARNED" || c.status === "PENDING" ? (
                      <Btn variant="tonal" onClick={() => onCommissionStatus(c.id, "APPROVED")}>Approve</Btn>
                    ) : null}
                    {c.status === "APPROVED" ? (
                      <Btn variant="primary" onClick={() => onCommissionStatus(c.id, "PAID")}>Mark paid</Btn>
                    ) : null}
                  </div>
                ) : null,
            },
          ]}
        />
      )}

      {recordOpen && (
        <RecordPaymentSheet
          bookings={scopedBookings.filter((b) => b.stage !== "Cancelled")}
          schedules={schedules}
          customers={customers}
          onClose={() => setRecordOpen(false)}
          onSave={onRecordPayment}
        />
      )}

      {receiptPay && (
        <ReceiptSheet
          payment={receiptPay}
          project={project}
          customerName={byId(customers, receiptPay.customerId)?.name ?? receiptPay.customerId}
          plotCode={byId(plots, receiptPay.plotId)?.id ?? receiptPay.plotId}
          onClose={() => setReceiptId(null)}
        />
      )}

      {detailPay && !receiptPay && (
        <EditSheet open title={`Payment ${detailPay.id}`} onClose={() => setDetailPaymentId(null)} onSave={() => setDetailPaymentId(null)}>
          <div className="space-y-2 text-sm" data-testid="finance-payment-detail">
            <p><span className="text-muted-foreground">Customer:</span> {byId(customers, detailPay.customerId)?.name}</p>
            <p><span className="text-muted-foreground">Amount:</span> <span className="numeric">{formatINR(detailPay.amount)}</span></p>
            <p><span className="text-muted-foreground">Method:</span> {PAYMENT_METHOD_LABEL[detailPay.method]}</p>
            <p><span className="text-muted-foreground">Txn:</span> {detailPay.txnRef}</p>
            <p><span className="text-muted-foreground">Receipt:</span> {detailPay.receiptNumber}</p>
            <p><span className="text-muted-foreground">Recon:</span> {RECON_STATUS_LABEL[detailPay.reconciliationStatus]}</p>
            {detailPay.notes && <p className="text-muted-foreground">{detailPay.notes}</p>}
            <Btn
              variant="tonal"
              onClick={() => {
                setDetailPaymentId(null);
                setReceiptId(detailPay.id);
              }}
            >
              <Printer className="size-3.5" /> Open receipt
            </Btn>
          </div>
        </EditSheet>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  count,
  countOnly,
  text,
  danger,
}: {
  label: string;
  value: number | null;
  count?: number;
  countOnly?: boolean;
  text?: string;
  danger?: boolean;
}) {
  return (
    <Panel>
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className={`pt-2 text-2xl font-semibold numeric tabular-nums ${danger ? "text-destructive" : ""}`}>
        {text ? text : countOnly ? (count ?? 0) : value === null ? "â€”" : formatINR(value, { compact: true })}
      </p>
      {!countOnly && typeof count === "number" && (
        <p className="pt-1 text-xs text-muted-foreground">{count} txns</p>
      )}
    </Panel>
  );
}

function EntityTable<T extends { id: string }>({
  rows,
  columns,
  empty,
  onRowClick,
}: {
  rows: T[];
  columns: { key: string; header: string; align?: "right"; cell: (row: T) => ReactNode }[];
  empty: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="max-h-[min(520px,55vh)] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-low/95 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-outline-variant/10 ${onRowClick ? "cursor-pointer hover:bg-surface-low/60" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 ${c.align === "right" ? "text-right" : ""}`}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-outline-variant/10 px-3 py-2 text-xs text-muted-foreground numeric">
        {rows.length} row{rows.length === 1 ? "" : "s"}
      </p>
    </Panel>
  );
}

function RecordPaymentSheet(props: {
  bookings: Booking[];
  schedules: PaymentScheduleItem[];
  customers: { id: string; name: string }[];
  onClose: () => void;
  onSave: (input: {
    bookingId: string;
    scheduleItemId: string;
    amount: number;
    method: PaymentMethod;
    txnRef: string;
    notes: string;
    paidAt: string;
  }) => void;
}) {
  const [bookingId, setBookingId] = useState(props.bookings[0]?.id ?? "");
  const scheduleOpts = props.schedules.filter((s) => s.bookingId === bookingId);
  const [scheduleItemId, setScheduleItemId] = useState(scheduleOpts[0]?.id ?? "");
  const [amount, setAmount] = useState(scheduleOpts[0]?.amountDue ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [txnRef, setTxnRef] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(isoDateOnly());

  useEffect(() => {
    const opts = props.schedules.filter((s) => s.bookingId === bookingId);
    setScheduleItemId(opts[0]?.id ?? "");
    setAmount(opts[0]?.amountDue ?? 0);
  }, [bookingId, props.schedules]);

  return (
    <EditSheet
        open
        title="Record payment"
        onClose={props.onClose}
        onSave={() => {
          if (!bookingId || !scheduleItemId || amount <= 0) return;
          props.onSave({ bookingId, scheduleItemId, amount, method, txnRef, notes, paidAt });
        }}
      >
      <div className="space-y-3" data-testid="finance-record-sheet">
        <Field label="Booking">
          <SelectInput
            value={bookingId}
            onChange={setBookingId}
            options={props.bookings.map((b) => ({
              value: b.id,
              label: `${b.id} Â· ${byId(props.customers, b.customerId)?.name ?? b.customerId}`,
            }))}
          />
        </Field>
        <Field label="Installment">
          <SelectInput
            value={scheduleItemId}
            onChange={(v) => {
              setScheduleItemId(v);
              const s = props.schedules.find((x) => x.id === v);
              if (s) setAmount(s.amountDue);
            }}
            options={
              scheduleOpts.length
                ? scheduleOpts.map((s) => ({
                    value: s.id,
                    label: `#${s.installmentNumber} ${s.name} Â· due ${s.dueDate} Â· ${formatINR(s.amountDue)}`,
                  }))
                : [{ value: "", label: "No schedule â€” create one first" }]
            }
          />
        </Field>
        <Field label="Amount">
          <NumberInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Method">
          <SelectInput
            value={method}
            onChange={(v) => setMethod(v as PaymentMethod)}
            options={(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => ({
              value: m,
              label: PAYMENT_METHOD_LABEL[m],
            }))}
          />
        </Field>
        <Field label="Txn ref">
          <TextInput value={txnRef} onChange={setTxnRef} placeholder="UTR / cheque no." />
        </Field>
        <Field label="Paid at">
          <TextInput value={paidAt} onChange={setPaidAt} />
        </Field>
        <Field label="Notes">
          <TextareaInput value={notes} onChange={setNotes} />
        </Field>
        <Btn
          variant="primary"
          disabled={!bookingId || !scheduleItemId || amount <= 0}
          onClick={() =>
            props.onSave({ bookingId, scheduleItemId, amount, method, txnRef, notes, paidAt })
          }
          data-testid="finance-record-save"
        >
          Save payment
        </Btn>
      </div>
    </EditSheet>
  );
}

function ReceiptSheet(props: {
  payment: FinancePayment;
  project: Project;
  customerName: string;
  plotCode: string;
  onClose: () => void;
}) {
  const p = props.payment;
  return (
    <EditSheet open title="Receipt" onClose={props.onClose} onSave={() => props.onClose()}>
      <div className="space-y-4 print:p-6" data-testid="finance-receipt-print">
        <div className="border-b border-outline-variant/20 pb-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Bhairava Â· Official receipt
          </p>
          <h3 className="font-display text-xl font-semibold">{p.receiptNumber}</h3>
          <p className="text-sm text-muted-foreground">{props.project.name}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Customer</dt>
            <dd className="font-medium">{props.customerName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Plot</dt>
            <dd className="font-medium">{props.plotCode}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Booking</dt>
            <dd className="font-medium">{p.bookingId}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{p.paidAt}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="font-medium numeric text-lg">{formatINR(p.amount)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Method</dt>
            <dd className="font-medium">{PAYMENT_METHOD_LABEL[p.method]}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Txn ref</dt>
            <dd className="font-medium">{p.txnRef}</dd>
          </div>
        </dl>
        <div className="flex gap-2 print:hidden">
          <Btn variant="primary" onClick={() => window.print()} data-testid="finance-receipt-print-btn">
            <Printer className="size-4" /> Print
          </Btn>
          <Btn variant="tonal" onClick={props.onClose}>
            Close
          </Btn>
        </div>
      </div>
    </EditSheet>
  );
}


