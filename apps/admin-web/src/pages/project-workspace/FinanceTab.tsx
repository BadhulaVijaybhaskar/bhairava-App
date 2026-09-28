import { useMemo, useState } from 'react';
import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Percent,
  Plus,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import {
  Btn,
  Chip,
  DataTable,
  EditSheet,
  EmptyState,
  Field,
  LoadingState,
  Metric,
  Panel,
  ScrollTabs,
  SectionTitle,
  SelectInput,
  TextInput,
  TextareaInput,
  cn,
  type ChipTone,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../../api';
import { Mono, Muted, Notice } from '../../components/common';
import {
  DASH,
  display,
  errMsg,
  formatDate,
  formatPaise,
  humanize,
  shortId,
  sumPaise,
  toPaise,
  useAsyncList,
  withIds,
  type AnyRow,
} from '../../lib/data';

type Row = AnyRow & { id: string | number };
type AsyncList = { rows: AnyRow[]; loading: boolean; err: string; reload: () => void };

const SECTIONS = [
  { key: 'collections', label: 'Collections', icon: LayoutDashboard },
  { key: 'schedule', label: 'Schedule', icon: CalendarClock },
  { key: 'payments', label: 'Payments', icon: Banknote },
  { key: 'receipts', label: 'Receipts', icon: FileText },
  { key: 'reconcile', label: 'Reconciliation', icon: Scale },
  { key: 'commissions', label: 'Commissions', icon: Percent },
] as const satisfies readonly { key: string; label: string; icon: LucideIcon }[];
type SectionKey = (typeof SECTIONS)[number]['key'];

const upper = (v: unknown) => String(v ?? '').toUpperCase();

const INSTALLMENT_STATUSES = ['UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED'] as const;
const RECON_STATUSES = ['UNRECONCILED', 'RECONCILED', 'MISMATCH', 'ADJUSTED', 'REVERSED'] as const;
const PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'CARD', 'OTHER'] as const;
const METHOD_LABEL: Record<string, string> = { UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque', CASH: 'Cash', CARD: 'Card', OTHER: 'Other' };
const methodLabel = (v: unknown) => METHOD_LABEL[upper(v)] ?? humanize(v);
const VOIDED = 'VOIDED';

const isVoided = (p: AnyRow) => Boolean(p.voidedAt);

function time(v: unknown): number {
  const t = v ? new Date(String(v)).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `"12,50,000.5"` → `125000050n`; `null` unless a positive rupee amount with ≤ 2 decimals. */
function rupeesToPaise(v: string): bigint | null {
  const m = v.replace(/[,\s]/g, '').match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!m) return null;
  const paise = BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
  return paise > 0n ? paise : null;
}

function paiseToRupeeInput(v: unknown): string {
  const p = toPaise(v);
  const whole = p / 100n;
  const frac = p % 100n;
  return frac === 0n ? whole.toString() : `${whole}.${frac.toString().padStart(2, '0')}`;
}

const isBillable = (s: AnyRow) => !s.waived && upper(s.status) !== 'WAIVED';
const isSettled = (s: AnyRow) => !isBillable(s) || upper(s.status) === 'PAID';

/** Server status, except unsettled instalments already past their due date read as overdue. */
function instalmentStatus(s: AnyRow, today: number): string {
  if (!isBillable(s)) return 'WAIVED';
  const status = upper(s.status);
  if (status !== 'PAID' && time(s.dueDate) > 0 && time(s.dueDate) < today) return 'OVERDUE';
  return status || 'UPCOMING';
}

function instalmentTone(status: string): ChipTone {
  if (status === 'PAID') return 'positive';
  if (status === 'OVERDUE') return 'danger';
  if (status === 'DUE' || status === 'PARTIALLY_PAID') return 'warning';
  if (status === 'UPCOMING') return 'info';
  return 'neutral';
}

function paymentState(p: AnyRow): string {
  return isVoided(p) ? VOIDED : upper(p.reconciliationStatus) || 'UNRECONCILED';
}

function reconTone(status: string): ChipTone {
  if (status === 'RECONCILED') return 'positive';
  if (status === 'UNRECONCILED') return 'warning';
  if (status === 'ADJUSTED') return 'info';
  if (status === 'MISMATCH' || status === 'REVERSED' || status === VOIDED) return 'danger';
  return 'neutral';
}

function commissionTone(status: string): ChipTone {
  if (status === 'PAID') return 'positive';
  if (status === 'APPROVED') return 'info';
  if (status === 'EARNED') return 'warning';
  return 'neutral';
}

function bookingLabel(b: AnyRow | undefined, fallbackId: unknown): string {
  if (!b) return shortId(fallbackId);
  const plot = b.plot?.number ? `Plot ${b.plot.number}` : shortId(b.id);
  return `${plot} · ${b.customer?.name ?? shortId(b.customerId)}`;
}

export function FinanceTab({ projectId, bookings }: { projectId: string; bookings: AsyncList }) {
  const payments = useAsyncList(() => api.payments.list({ projectId }) as Promise<AnyRow[]>, [projectId]);
  const schedules = useAsyncList(() => api.paymentSchedules.list(), [projectId]);
  const receipts = useAsyncList(() => api.receipts.list(), [projectId]);
  const commissions = useAsyncList(() => api.commissions.list(), [projectId]);

  const [section, setSection] = useState<SectionKey>('collections');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [recordOpen, setRecordOpen] = useState(false);
  const [flash, setFlash] = useState('');

  const today = startOfToday();

  const data = useMemo(() => {
    const bookingById = new Map(bookings.rows.map((b) => [String(b.id), b]));
    const inProject = (bookingId: unknown) => bookingById.has(String(bookingId));

    const projectSchedules = schedules.rows
      .filter((s) => s.projectId === projectId || inProject(s.bookingId))
      .sort((a, b) => time(a.dueDate) - time(b.dueDate) || Number(a.installmentNumber ?? 0) - Number(b.installmentNumber ?? 0));
    const projectPayments = payments.rows;
    const livePayments = projectPayments.filter((p) => !isVoided(p));
    const paymentById = new Map(projectPayments.map((p) => [String(p.id), p]));
    const projectReceipts = receipts.rows.filter(
      (r) => r.booking?.projectId === projectId || r.payment?.projectId === projectId || inProject(r.bookingId),
    );
    const projectCommissions = commissions.rows.filter((c) => inProject(c.bookingId ?? c.booking?.id));

    const openBookings = bookings.rows.filter((b) => upper(b.state) !== 'CANCELLED');
    let payable = 0n;
    let outstanding = 0n;
    for (const b of openBookings) {
      const own = projectSchedules.filter((s) => String(s.bookingId) === String(b.id) && isBillable(s));
      const due = own.length ? sumPaise(own, 'amountDuePaise') : toPaise(b.agreementValuePaise);
      const paid = sumPaise(livePayments.filter((p) => String(p.bookingId) === String(b.id)), 'amountPaise');
      payable += due;
      if (due > paid) outstanding += due - paid;
    }

    const overdue = projectSchedules.filter((s) => instalmentStatus(s, today) === 'OVERDUE');
    const monthStart = new Date(new Date(today).getFullYear(), new Date(today).getMonth(), 1).getTime();
    const horizon = today + 30 * 86_400_000;
    const upcoming = projectSchedules.filter((s) => !isSettled(s) && time(s.dueDate) >= today && time(s.dueDate) <= horizon);
    const collected = sumPaise(livePayments, 'amountPaise');

    return {
      bookingById,
      paymentById,
      schedules: projectSchedules,
      payments: projectPayments,
      livePayments,
      receipts: projectReceipts,
      commissions: projectCommissions,
      openBookings,
      collected,
      collectedThisMonth: sumPaise(livePayments.filter((p) => time(p.paidAt) >= monthStart), 'amountPaise'),
      payable,
      outstanding,
      overdue,
      overdueValue: sumPaise(overdue, 'amountDuePaise'),
      upcoming,
      upcomingValue: sumPaise(upcoming, 'amountDuePaise'),
      commissionTotal: sumPaise(projectCommissions, 'amountPaise'),
      collectedPct: payable > 0n ? Math.min(100, Number((collected * 1000n) / payable) / 10) : 0,
    };
  }, [bookings.rows, schedules.rows, payments.rows, receipts.rows, commissions.rows, projectId, today]);

  function openSection(next: SectionKey) {
    setSection(next);
    setQ('');
    setStatus('all');
  }

  function reloadAll() {
    payments.reload();
    schedules.reload();
    receipts.reload();
    commissions.reload();
  }

  const needle = q.trim().toLowerCase();
  const matches = (...parts: unknown[]) => !needle || parts.some((p) => String(p ?? '').toLowerCase().includes(needle));
  const customerOf = (bookingId: unknown) => data.bookingById.get(String(bookingId))?.customer?.name;

  const filteredSchedules = data.schedules.filter(
    (s) =>
      (status === 'all' || instalmentStatus(s, today) === status) &&
      matches(s.name, s.bookingId, customerOf(s.bookingId), data.bookingById.get(String(s.bookingId))?.plot?.number),
  );
  const filteredPayments = data.payments.filter(
    (p) => (status === 'all' || paymentState(p) === status) && matches(p.receiptNumber, p.txnRef, p.bookingId, customerOf(p.bookingId)),
  );
  const filteredReceipts = data.receipts.filter((r) => matches(r.receiptNumber, r.bookingId, customerOf(r.bookingId), r.payment?.txnRef));
  const reconRows = data.livePayments.filter(
    (p) => (status === 'all' || paymentState(p) === status) && matches(p.receiptNumber, p.txnRef, p.bookingId, customerOf(p.bookingId)),
  );

  const sectionCount: Partial<Record<SectionKey, number>> = {
    schedule: data.schedules.length,
    payments: data.payments.length,
    receipts: data.receipts.length,
    reconcile: data.livePayments.filter((p) => paymentState(p) !== 'RECONCILED').length,
    commissions: data.commissions.length,
  };

  const loadingAny = bookings.loading || payments.loading || schedules.loading || receipts.loading || commissions.loading;
  const loadErrors = [
    bookings.err && `bookings: ${bookings.err}`,
    payments.err && `payments: ${payments.err}`,
    schedules.err && `schedules: ${schedules.err}`,
    receipts.err && `receipts: ${receipts.err}`,
    commissions.err && `commissions: ${commissions.err}`,
  ].filter(Boolean);

  const paymentColumns: DataTableColumn<Row>[] = [
    { key: 'id', header: 'Payment', cell: (p) => <Mono>{p.receiptNumber || shortId(p.id)}</Mono> },
    { key: 'booking', header: 'Booking', cell: (p) => <Muted>{bookingLabel(data.bookingById.get(String(p.bookingId)), p.bookingId)}</Muted> },
    { key: 'method', header: 'Method', cell: (p) => <Muted>{methodLabel(p.method)}</Muted> },
    { key: 'paidAt', header: 'Paid', cell: (p) => <Mono className="text-muted-foreground">{formatDate(p.paidAt)}</Mono> },
    { key: 'state', header: 'Status', cell: (p) => <Chip tone={reconTone(paymentState(p))}>{humanize(paymentState(p))}</Chip> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <span className={cn('numeric text-sm font-medium', isVoided(p) && 'text-muted-foreground line-through')}>{formatPaise(p.amountPaise)}</span>
      ),
    },
  ];

  const statusOptions =
    section === 'schedule'
      ? INSTALLMENT_STATUSES
      : section === 'payments'
        ? [...RECON_STATUSES, VOIDED]
        : section === 'reconcile'
          ? RECON_STATUSES
          : null;

  return (
    <div className="space-y-4" data-testid="finance-workspace">
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionTitle className="pb-1">Finance workspace</SectionTitle>
            <Muted className="block text-sm">Schedules, payments, receipts, reconciliation and commissions for this project — live from the ledger.</Muted>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="tonal" onClick={() => openSection('schedule')}>
              <ClipboardCheck className="h-4 w-4" /> Schedule
            </Btn>
            <Btn variant="primary" onClick={() => setRecordOpen(true)} disabled={bookings.loading || data.openBookings.length === 0}>
              <Plus className="h-4 w-4" /> Record payment
            </Btn>
          </div>
        </div>
        <ScrollTabs activeKey={section} role="tablist" aria-label="Finance sections" className="gap-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.key;
            const count = loadingAny ? undefined : sectionCount[s.key];
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active ? 'true' : undefined}
                onClick={() => openSection(s.key)}
                className={cn(
                  'inline-flex flex-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-muted-foreground hover:bg-surface-low',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {count ? <span className="numeric rounded-full bg-surface-c px-1.5 text-[10px] text-muted-foreground">{count}</span> : null}
              </button>
            );
          })}
        </ScrollTabs>
      </Panel>

      <Notice tone="ok">{flash}</Notice>
      {loadErrors.length ? (
        <Notice tone="err">
          Some finance data couldn't load — {loadErrors.join('; ')}.{' '}
          <button type="button" className="underline" onClick={() => { bookings.reload(); reloadAll(); }}>Retry</button>
        </Notice>
      ) : null}

      {statusOptions || section === 'receipts' ? (
        <Panel className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Search">
            <TextInput value={q} onChange={setQ} placeholder="Customer, booking, receipt, txn ref…" />
          </Field>
          {statusOptions ? (
            <Field label="Status">
              <SelectInput
                value={status}
                onChange={setStatus}
                options={[{ value: 'all', label: 'All' }, ...statusOptions.map((s) => ({ value: s, label: humanize(s) }))]}
              />
            </Field>
          ) : null}
        </Panel>
      ) : null}

      {loadingAny ? (
        <LoadingState variant={section === 'collections' ? 'metrics' : 'rows'} rows={4} />
      ) : (
        <>
          {section === 'collections' && (
            <div className="space-y-4" data-testid="finance-dashboard">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric accent label="Collected" value={formatPaise(data.collected.toString())} hint={`${data.livePayments.length} payments, voids excluded`} />
                <Metric label="Outstanding" value={formatPaise(data.outstanding.toString())} hint="Scheduled (or agreement) less paid" />
                <Metric label="Bookings" value={data.openBookings.length} hint={`${bookings.rows.length - data.openBookings.length} cancelled`} />
                <Metric
                  label="Overdue instalments"
                  value={data.overdue.length}
                  hint={data.overdue.length ? `${formatPaise(data.overdueValue.toString())} instalment value` : 'Nothing past due'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric size="sm" label="Collected this month" value={formatPaise(data.collectedThisMonth.toString())} />
                <Metric size="sm" label="Due next 30 days" value={formatPaise(data.upcomingValue.toString())} hint={`${data.upcoming.length} instalments`} />
                <Metric size="sm" label="Receipts issued" value={data.receipts.length} />
                <Metric size="sm" label="Commissions accrued" value={formatPaise(data.commissionTotal.toString())} hint={`${data.commissions.length} records`} />
              </div>
              {data.payable > 0n ? (
                <Panel>
                  <SectionTitle aside={`${formatPaise(data.collected.toString())} of ${formatPaise(data.payable.toString())}`}>Collection progress</SectionTitle>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-c">
                    <div className="gradient-primary h-full rounded-full transition-[width] duration-500" style={{ width: `${data.collectedPct}%` }} />
                  </div>
                  <p className="numeric pt-2 text-xs text-muted-foreground">{data.collectedPct.toFixed(1)}% collected across open bookings</p>
                </Panel>
              ) : null}
              <div className="min-w-0">
                <SectionTitle
                  aside={
                    data.payments.length ? (
                      <button type="button" className="hover:text-foreground" onClick={() => openSection('payments')}>
                        All payments
                      </button>
                    ) : undefined
                  }
                >
                  Recent payments
                </SectionTitle>
                <DataTable<Row>
                  rows={withIds(data.payments.slice(0, 6))}
                  linkTo={(p) => `/payments/${p.id}`}
                  emptyMessage="No payments recorded for this project yet."
                  columns={paymentColumns}
                />
              </div>
            </div>
          )}

          {section === 'schedule' &&
            (data.schedules.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No payment schedules"
                description="Instalment schedules are created with the booking in the booking wizard."
              />
            ) : (
              <DataTable<Row>
                rows={withIds(filteredSchedules)}
                linkTo={(s) => (s.bookingId ? `/bookings/${s.bookingId}` : null)}
                emptyMessage="No instalments match these filters."
                columns={[
                  { key: 'n', header: '#', width: '3rem', cell: (s) => <Mono className="text-muted-foreground">{display(s.installmentNumber)}</Mono> },
                  {
                    key: 'name',
                    header: 'Instalment',
                    cell: (s) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{display(s.name)}</p>
                        <Muted className="block truncate">{bookingLabel(data.bookingById.get(String(s.bookingId)), s.bookingId)}</Muted>
                      </div>
                    ),
                  },
                  { key: 'due', header: 'Due', cell: (s) => <Mono className="text-muted-foreground">{formatDate(s.dueDate)}</Mono> },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (s) => {
                      const st = instalmentStatus(s, today);
                      return <Chip tone={instalmentTone(st)}>{humanize(st)}</Chip>;
                    },
                  },
                  { key: 'amount', header: 'Amount due', align: 'right', cell: (s) => <span className="numeric text-sm font-medium">{formatPaise(s.amountDuePaise)}</span> },
                ]}
              />
            ))}

          {section === 'payments' && (
            <DataTable<Row>
              rows={withIds(filteredPayments)}
              linkTo={(p) => `/payments/${p.id}`}
              emptyMessage={data.payments.length ? 'No payments match these filters.' : 'No payments recorded for this project yet.'}
              columns={paymentColumns}
            />
          )}

          {section === 'receipts' && (
            <DataTable<Row>
              rows={withIds(filteredReceipts)}
              linkTo={(r) => `/receipts/${r.id}`}
              emptyMessage={data.receipts.length ? 'No receipts match this search.' : 'Receipts are issued automatically when payments are recorded.'}
              columns={[
                { key: 'no', header: 'Receipt #', cell: (r) => <Mono>{display(r.receiptNumber)}</Mono> },
                { key: 'booking', header: 'Booking', cell: (r) => <Muted>{bookingLabel(data.bookingById.get(String(r.bookingId)), r.bookingId)}</Muted> },
                { key: 'method', header: 'Method', cell: (r) => <Muted>{methodLabel(r.payment?.method)}</Muted> },
                { key: 'issued', header: 'Issued', cell: (r) => <Mono className="text-muted-foreground">{formatDate(r.issuedAt)}</Mono> },
                {
                  key: 'state',
                  header: 'Payment',
                  cell: (r) => {
                    const p = data.paymentById.get(String(r.paymentId));
                    return p ? <Chip tone={reconTone(paymentState(p))}>{humanize(paymentState(p))}</Chip> : <Muted>{DASH}</Muted>;
                  },
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  cell: (r) => {
                    const voided = isVoided(data.paymentById.get(String(r.paymentId)) ?? {});
                    return <span className={cn('numeric text-sm font-medium', voided && 'text-muted-foreground line-through')}>{formatPaise(r.payment?.amountPaise)}</span>;
                  },
                },
              ]}
            />
          )}

          {section === 'reconcile' && (
            <div className="space-y-4" data-testid="finance-reconcile">
              <Panel>
                <SectionTitle aside={`${data.livePayments.length} live payments`}>Reconciliation status</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {RECON_STATUSES.map((s) => {
                    const n = data.livePayments.filter((p) => paymentState(p) === s).length;
                    const value = sumPaise(data.livePayments.filter((p) => paymentState(p) === s), 'amountPaise');
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(status === s ? 'all' : s)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl bg-surface-low px-3 py-2 text-left transition-colors hover:bg-surface-c',
                          status === s && 'ring-1 ring-primary',
                        )}
                      >
                        <Chip tone={reconTone(s)}>{humanize(s)}</Chip>
                        <span className="numeric text-sm font-semibold">{n}</span>
                        <Muted className="numeric">{formatPaise(value.toString())}</Muted>
                      </button>
                    );
                  })}
                  <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2">
                    <Chip tone="neutral">Voided · excluded</Chip>
                    <span className="numeric text-sm font-semibold">{data.payments.length - data.livePayments.length}</span>
                  </span>
                </div>
                <p className="pt-4 text-xs text-muted-foreground">
                  Reconciliation is recorded server-side when payments are verified; voided payments are excluded. Open a payment to review or void it.
                </p>
              </Panel>
              <DataTable<Row>
                rows={withIds(reconRows)}
                linkTo={(p) => `/payments/${p.id}`}
                emptyMessage={data.livePayments.length ? 'No payments match these filters.' : 'No live payments to reconcile.'}
                columns={[
                  { key: 'id', header: 'Payment', cell: (p) => <Mono>{p.receiptNumber || shortId(p.id)}</Mono> },
                  { key: 'booking', header: 'Booking', cell: (p) => <Muted>{bookingLabel(data.bookingById.get(String(p.bookingId)), p.bookingId)}</Muted> },
                  { key: 'txn', header: 'Txn ref', cell: (p) => <Mono className="text-muted-foreground">{display(p.txnRef)}</Mono> },
                  { key: 'paidAt', header: 'Paid', cell: (p) => <Mono className="text-muted-foreground">{formatDate(p.paidAt)}</Mono> },
                  { key: 'status', header: 'Recon', cell: (p) => <Chip tone={reconTone(paymentState(p))}>{humanize(paymentState(p))}</Chip> },
                  { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="numeric text-sm font-medium">{formatPaise(p.amountPaise)}</span> },
                ]}
              />
            </div>
          )}

          {section === 'commissions' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {(['PENDING', 'EARNED', 'APPROVED', 'PAID'] as const).map((s) => {
                  const rows = data.commissions.filter((c) => upper(c.status) === s);
                  return <Metric key={s} size="sm" label={humanize(s)} value={formatPaise(sumPaise(rows, 'amountPaise').toString())} hint={`${rows.length} records`} />;
                })}
              </div>
              <DataTable<Row>
                rows={withIds(data.commissions)}
                linkTo={(c) => (c.bookingId ? `/bookings/${c.bookingId}` : null)}
                emptyMessage="No commissions accrued on this project's bookings."
                columns={[
                  {
                    key: 'agent',
                    header: 'Agent',
                    cell: (c) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{display(c.agent?.name ?? shortId(c.agentId))}</p>
                        {c.agent?.code ? <Muted className="block">{c.agent.code}</Muted> : null}
                      </div>
                    ),
                  },
                  { key: 'booking', header: 'Booking', cell: (c) => <Muted>{bookingLabel(data.bookingById.get(String(c.bookingId)), c.bookingId)}</Muted> },
                  { key: 'status', header: 'Status', cell: (c) => <Chip tone={commissionTone(upper(c.status))}>{humanize(c.status)}</Chip> },
                  {
                    key: 'updated',
                    header: 'Last milestone',
                    cell: (c) => <Mono className="text-muted-foreground">{formatDate(c.paidAt || c.approvedAt || c.earnedAt || c.createdAt)}</Mono>,
                  },
                  { key: 'amount', header: 'Commission', align: 'right', cell: (c) => <span className="numeric text-sm font-medium">{formatPaise(c.amountPaise)}</span> },
                ]}
              />
            </div>
          )}
        </>
      )}

      {recordOpen && (
        <RecordPaymentSheet
          bookings={data.openBookings}
          schedules={data.schedules}
          onClose={() => setRecordOpen(false)}
          onRecorded={(p) => {
            setRecordOpen(false);
            setFlash(`Payment ${p.receiptNumber || shortId(p.id)} recorded — receipt issued.`);
            reloadAll();
            openSection('payments');
          }}
        />
      )}
    </div>
  );
}

function RecordPaymentSheet({
  bookings,
  schedules,
  onClose,
  onRecorded,
}: {
  bookings: AnyRow[];
  schedules: AnyRow[];
  onClose: () => void;
  onRecorded: (payment: AnyRow) => void;
}) {
  const firstOpen = (bookingId: string) => schedules.find((s) => String(s.bookingId) === bookingId && !isSettled(s));
  const initialBooking = String(bookings[0]?.id ?? '');
  const initialItem = firstOpen(initialBooking);

  const [bookingId, setBookingId] = useState(initialBooking);
  const [scheduleItemId, setScheduleItemId] = useState(String(initialItem?.id ?? ''));
  const [amount, setAmount] = useState(initialItem ? paiseToRupeeInput(initialItem.amountDuePaise) : '');
  const [method, setMethod] = useState<string>('UPI');
  const [paidAt, setPaidAt] = useState(todayIso());
  const [txnRef, setTxnRef] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const items = schedules.filter((s) => String(s.bookingId) === bookingId && !isSettled(s));
  const paise = rupeesToPaise(amount);

  function pickBooking(next: string) {
    setBookingId(next);
    const item = firstOpen(next);
    setScheduleItemId(String(item?.id ?? ''));
    setAmount(item ? paiseToRupeeInput(item.amountDuePaise) : '');
  }

  function pickItem(next: string) {
    setScheduleItemId(next);
    const item = items.find((s) => String(s.id) === next);
    if (item) setAmount(paiseToRupeeInput(item.amountDuePaise));
  }

  async function save() {
    if (!bookingId || !paise || !paidAt) return;
    setSaving(true);
    setErr('');
    try {
      const payment = (await api.payments.create({
        bookingId,
        amountPaise: paise.toString(),
        paidAt,
        method,
        ...(scheduleItemId ? { scheduleItemId } : {}),
        ...(txnRef.trim() ? { txnRef: txnRef.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })) as AnyRow;
      onRecorded(payment);
    } catch (ex) {
      setErr(errMsg(ex));
      setSaving(false);
    }
  }

  return (
    <EditSheet
      open
      eyebrow="Finance"
      title="Record payment"
      description="Creates the payment and issues a receipt number server-side."
      saveLabel="Record payment"
      saving={saving}
      saveDisabled={!bookingId || !paise || !paidAt}
      onClose={onClose}
      onSave={() => void save()}
    >
      <Notice tone="err">{err}</Notice>
      <Field label="Booking" required>
        <SelectInput
          value={bookingId}
          onChange={pickBooking}
          options={bookings.map((b) => ({ value: String(b.id), label: `${bookingLabel(b, b.id)} · ${formatPaise(b.agreementValuePaise)}` }))}
        />
      </Field>
      <Field label="Instalment" hint={items.length ? undefined : 'No open instalments — payment is recorded against the booking.'}>
        <SelectInput
          value={scheduleItemId}
          onChange={pickItem}
          options={[
            { value: '', label: 'Not linked to an instalment' },
            ...items.map((s) => ({
              value: String(s.id),
              label: `${s.installmentNumber != null ? `#${s.installmentNumber} ` : ''}${s.name} · due ${formatDate(s.dueDate)} · ${formatPaise(s.amountDuePaise)}`,
            })),
          ]}
        />
      </Field>
      <Field label="Amount (₹)" required error={amount && !paise ? 'Enter a positive amount with up to 2 decimals.' : undefined}>
        <TextInput value={amount} onChange={setAmount} inputMode="decimal" placeholder="250000" invalid={Boolean(amount && !paise)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Method" required>
          <SelectInput value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: methodLabel(m) }))} />
        </Field>
        <Field label="Paid on" required>
          <TextInput type="date" value={paidAt} onChange={setPaidAt} max={todayIso()} />
        </Field>
      </div>
      <Field label="Txn ref">
        <TextInput value={txnRef} onChange={setTxnRef} placeholder="UTR / cheque no." />
      </Field>
      <Field label="Notes">
        <TextareaInput value={notes} onChange={setNotes} rows={2} />
      </Field>
    </EditSheet>
  );
}
