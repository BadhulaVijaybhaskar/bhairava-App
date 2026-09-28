import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, CalendarClock, FileText, Receipt } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Btn,
  Chip,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  LinkBtn,
  LoadingState,
  Metric,
  Panel,
  PlotStatusChip,
  RecordHeader,
  SectionTitle,
  TextareaInput,
  Timeline,
  cn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Fact, Mono, Muted, Notice, StatusChip } from '../components/common';
import {
  DASH,
  display,
  errMsg,
  formatDate,
  formatDateTime,
  formatPaise,
  humanize,
  shortId,
  useAsyncList,
  withIds,
  type AnyRow,
} from '../lib/data';

type Row = AnyRow & { id: string | number };

/* --------------------------------- helpers --------------------------------- */

function toBig(v: unknown): bigint {
  if (v === null || v === undefined || v === '') return 0n;
  try {
    return BigInt(String(v));
  } catch {
    return 0n;
  }
}

function sumPaise(rows: AnyRow[], key: string): bigint {
  return rows.reduce((acc, r) => acc + toBig(r[key]), 0n);
}

const isVoided = (p: AnyRow) => Boolean(p.voidedAt);

function time(v: unknown): number {
  const t = v ? new Date(String(v)).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
}

type TimelineEntry = { at: unknown; title: ReactNode; detail?: ReactNode };

/** Newest first; entries without a timestamp are dropped. */
function toTimeline(entries: TimelineEntry[]) {
  return entries
    .filter((e) => time(e.at) > 0)
    .sort((a, b) => time(b.at) - time(a.at))
    .map((e) => ({ time: formatDateTime(e.at), title: e.title, detail: e.detail }));
}

function paymentStatus(p: AnyRow): { label: string; tone?: 'danger' } {
  if (isVoided(p)) return { label: 'Voided', tone: 'danger' };
  return { label: humanize(p.reconciliationStatus || 'Recorded') };
}

function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <div className="pt-6 pb-2 sm:pt-8">
      <Link to={to} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {children}
      </Link>
    </div>
  );
}

function HeroHeader({ eyebrow, value, status, actions }: { eyebrow: ReactNode; value: ReactNode; status: ReactNode; actions?: ReactNode }) {
  return (
    <div className="rise flex flex-wrap items-end justify-between gap-4 pb-6 sm:pb-8">
      <div className="min-w-0">
        <p className="flex items-center gap-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
          {eyebrow}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="numeric font-display text-4xl font-semibold tracking-tight sm:text-5xl">{value}</h1>
          {status}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function AmountRow({ label, value, muted, strong }: { label: string; value: ReactNode; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('numeric text-sm', strong ? 'text-lg font-semibold' : muted ? 'text-muted-foreground' : 'font-medium')}>{value}</span>
    </div>
  );
}

function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Panel className="p-5 sm:p-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <div className="pt-1.5">{children}</div>
    </Panel>
  );
}

function RecordLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn('font-medium transition-colors hover:text-primary', className)}>
      {children}
    </Link>
  );
}

function NotFound({ what, id, back, backLabel, error, onRetry }: { what: string; id?: string; back: string; backLabel: string; error?: string; onRetry?: () => void }) {
  const action = (
    <LinkBtn to={back} variant="tonal">
      <ArrowLeft className="h-4 w-4" /> {backLabel}
    </LinkBtn>
  );
  if (error) return <ErrorState className="mt-6" title={`${what} not available`} error={error} onRetry={onRetry} action={action} />;
  return <EmptyState className="mt-6" title={`${what} not found`} description={`No ${what.toLowerCase()} with id “${id ?? ''}” is visible to you.`} action={action} />;
}

/* ------------------------------ booking detail ------------------------------ */

export function BookingDetailPage() {
  const { bookingId = '' } = useParams();
  const bookings = useAsyncList(() => api.bookings.list() as Promise<AnyRow[]>, [bookingId]);
  const schedule = useAsyncList(() => api.paymentSchedules.list(bookingId), [bookingId]);
  const payments = useAsyncList(() => api.payments.list({ bookingId }) as Promise<AnyRow[]>, [bookingId]);
  const documents = useAsyncList(() => api.documents.list({ bookingId }) as Promise<AnyRow[]>, [bookingId]);
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const agents = useAsyncList(() => api.agents.list());

  const booking = useMemo(() => bookings.rows.find((b) => String(b.id) === bookingId) ?? null, [bookings.rows, bookingId]);
  const project = booking ? projects.rows.find((p) => p.id === booking.projectId) : undefined;
  const agentId = booking?.agentId ?? booking?.agent?.id;
  const agent = agentId ? { ...booking?.agent, ...agents.rows.find((a) => a.id === agentId) } : null;

  const livePayments = payments.rows.filter((p) => !isVoided(p));
  const paid = sumPaise(livePayments, 'amountPaise');
  const agreement = toBig(booking?.agreementValuePaise);
  const advance = toBig(booking?.advancePaise);

  const sortedSchedule = useMemo(
    () => [...schedule.rows].sort((a, b) => time(a.dueDate) - time(b.dueDate) || Number(a.installmentNumber ?? 0) - Number(b.installmentNumber ?? 0)),
    [schedule.rows],
  );
  const billable = sortedSchedule.filter((s) => !s.waived && String(s.status).toUpperCase() !== 'WAIVED');
  const hasSchedule = sortedSchedule.length > 0;
  const scheduledTotal = sumPaise(billable, 'amountDuePaise');
  const payable = hasSchedule ? scheduledTotal : agreement;
  const balance = payable > paid ? payable - paid : 0n;
  const overdue = sumPaise(billable.filter((s) => String(s.status).toUpperCase() === 'OVERDUE'), 'amountDuePaise');
  const nextDue = billable.find((s) => String(s.status).toUpperCase() !== 'PAID');
  const collectedPct = payable > 0n ? Math.min(100, Number((paid * 1000n) / payable) / 10) : 0;

  const timeline = useMemo(() => {
    if (!booking) return [];
    const entries: TimelineEntry[] = [
      {
        at: booking.createdAt,
        title: 'Booking created',
        detail: booking.agent?.name ? `Attributed to ${booking.agent.name}` : 'No agent attributed',
      },
    ];
    if (booking.bookedAt && time(booking.bookedAt) !== time(booking.createdAt)) {
      entries.push({ at: booking.bookedAt, title: 'Booked', detail: `Agreement value ${formatPaise(booking.agreementValuePaise)}` });
    }
    for (const p of payments.rows) {
      entries.push({
        at: p.paidAt,
        title: `Payment received · ${formatPaise(p.amountPaise)}`,
        detail: [humanize(p.method), p.receiptNumber || p.txnRef].filter(Boolean).join(' · '),
      });
      if (p.voidedAt) entries.push({ at: p.voidedAt, title: `Payment voided · ${formatPaise(p.amountPaise)}`, detail: p.voidReason || undefined });
    }
    return toTimeline(entries);
  }, [booking, payments.rows]);

  if (bookings.loading) return <LoadingState label="Loading booking…" />;
  if (bookings.err || !booking) {
    return <NotFound what="Booking" id={bookingId} back="/bookings" backLabel="Back to bookings" error={bookings.err} onRetry={bookings.reload} />;
  }

  return (
    <>
      <BackLink to="/bookings">Bookings</BackLink>

      <HeroHeader
        eyebrow={<>Booking · <span className="numeric normal-case">{shortId(booking.id)}</span></>}
        value={formatPaise(booking.agreementValuePaise)}
        status={<StatusChip value={booking.state} />}
        actions={
          booking.cancelRequestStatus ? <StatusChip value={`Cancel ${humanize(booking.cancelRequestStatus).toLowerCase()}`} tone="warning" /> : null
        }
      />

      <div className="grid gap-6 pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <SectionTitle aside={hasSchedule ? `${billable.length} instalments` : 'No schedule yet'}>Financial breakdown</SectionTitle>
            {payments.err ? <Notice tone="err" className="mb-4">Couldn't load payments: {payments.err}</Notice> : null}
            <div className="space-y-3">
              <AmountRow label="Agreement value" value={formatPaise(agreement.toString())} />
              {advance > 0n ? <AmountRow label="Advance on booking" value={formatPaise(advance.toString())} muted /> : null}
              {hasSchedule ? <AmountRow label="Scheduled total" value={formatPaise(scheduledTotal.toString())} strong /> : null}
              <AmountRow label="Paid till date" value={payments.loading ? DASH : formatPaise(paid.toString())} />
              {overdue > 0n ? <AmountRow label="Overdue" value={<span className="text-destructive">{formatPaise(overdue.toString())}</span>} /> : null}
              <AmountRow label="Balance due" value={payments.loading ? DASH : formatPaise(balance.toString())} strong />
            </div>
            {!payments.loading && payable > 0n ? (
              <div className="pt-5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-c">
                  <div className="gradient-primary h-full rounded-full transition-all" style={{ width: `${collectedPct}%` }} />
                </div>
                <div className="flex justify-between pt-2 text-xs text-muted-foreground">
                  <span className="numeric">{collectedPct.toFixed(1)}% collected</span>
                  <span>
                    {nextDue ? (
                      <>
                        Next due <span className="numeric">{formatDate(nextDue.dueDate)}</span> · {formatPaise(nextDue.amountDuePaise)}
                      </>
                    ) : hasSchedule ? (
                      'All instalments settled'
                    ) : (
                      'Against agreement value'
                    )}
                  </span>
                </div>
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="grid content-start gap-4 lg:col-span-4">
          <SidePanel label="Customer">
            {booking.customerId ? (
              <RecordLink to={`/customers/${booking.customerId}`} className="block text-sm">
                {display(booking.customer?.name ?? shortId(booking.customerId))}
              </RecordLink>
            ) : (
              <p className="text-sm">{DASH}</p>
            )}
            <Muted className="block">{[booking.customer?.phone, booking.customer?.city].filter(Boolean).join(' · ') || DASH}</Muted>
          </SidePanel>
          <SidePanel label="Plot / Project">
            <div className="flex items-center gap-2">
              <span className="numeric text-sm font-medium">{display(booking.plot?.number ?? shortId(booking.plotId))}</span>
              {booking.plot?.status ? <PlotStatusChip status={booking.plot.status} /> : null}
            </div>
            {booking.projectId ? (
              <RecordLink to={`/projects/${booking.projectId}`} className="block text-xs font-normal text-muted-foreground">
                {project?.name ?? shortId(booking.projectId)}
              </RecordLink>
            ) : null}
          </SidePanel>
          <SidePanel label="Agent">
            {agent?.id ? (
              <>
                <RecordLink to={`/agents/${agent.id}`} className="block text-sm">
                  {display(agent.name)}
                </RecordLink>
                <Muted className="block">{[agent.code, agent.region].filter(Boolean).join(' · ') || DASH}</Muted>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Direct booking</p>
            )}
          </SidePanel>
        </div>
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <div>
            <SectionTitle aside={hasSchedule ? formatPaise(scheduledTotal.toString()) : undefined}>Payment schedule</SectionTitle>
            {schedule.err ? (
              <ErrorState compact title="Couldn't load schedule" error={schedule.err} onRetry={schedule.reload} />
            ) : schedule.loading ? (
              <LoadingState variant="rows" rows={3} />
            ) : !hasSchedule ? (
              <EmptyState
                compact
                icon={CalendarClock}
                title="No payment schedule"
                description="No instalments have been scheduled for this booking yet."
              />
            ) : (
              <DataTable<Row>
                rows={withIds(sortedSchedule)}
                columns={[
                  { key: 'n', header: '#', width: '3rem', cell: (r) => <Mono className="text-muted-foreground">{display(r.installmentNumber)}</Mono> },
                  { key: 'name', header: 'Instalment', cell: (r) => <span className="text-sm">{display(r.name)}</span> },
                  { key: 'dueDate', header: 'Due date', cell: (r) => <Mono className="text-muted-foreground">{formatDate(r.dueDate)}</Mono> },
                  { key: 'status', header: 'State', cell: (r) => <StatusChip value={r.waived ? 'Waived' : r.status} /> },
                  { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <span className="numeric text-sm font-medium">{formatPaise(r.amountDuePaise)}</span> },
                ]}
              />
            )}
          </div>

          <div>
            <SectionTitle aside={payments.loading ? undefined : `${livePayments.length} recorded`}>Payments received</SectionTitle>
            {payments.err ? (
              <ErrorState compact title="Couldn't load payments" error={payments.err} onRetry={payments.reload} />
            ) : payments.loading ? (
              <LoadingState variant="rows" rows={3} />
            ) : (
              <DataTable<Row>
                rows={withIds(payments.rows)}
                linkTo={(r) => `/payments/${r.id}`}
                emptyMessage="No payments recorded against this booking."
                columns={[
                  { key: 'id', header: 'Payment', cell: (r) => <Mono>{r.receiptNumber || shortId(r.id)}</Mono> },
                  { key: 'method', header: 'Mode', cell: (r) => <Muted>{humanize(r.method)}</Muted> },
                  { key: 'status', header: 'Status', cell: (r) => <StatusChip value={paymentStatus(r).label} tone={paymentStatus(r).tone} /> },
                  { key: 'paidAt', header: 'Date', cell: (r) => <Mono className="text-muted-foreground">{formatDate(r.paidAt)}</Mono> },
                  {
                    key: 'amount',
                    header: 'Amount',
                    align: 'right',
                    cell: (r) => <span className={cn('numeric text-sm font-medium', isVoided(r) && 'text-muted-foreground line-through')}>{formatPaise(r.amountPaise)}</span>,
                  },
                ]}
              />
            )}
          </div>

          <div>
            <SectionTitle aside={<Link to="/documents" className="hover:text-foreground">All documents</Link>}>Documents</SectionTitle>
            {documents.err ? (
              <ErrorState compact title="Couldn't load documents" error={documents.err} onRetry={documents.reload} />
            ) : documents.loading ? (
              <LoadingState variant="rows" rows={2} />
            ) : documents.rows.length === 0 ? (
              <EmptyState compact icon={FileText} title="No documents on file" description="Agreements and KYC uploaded against this booking appear here." />
            ) : (
              <Panel className="divide-y divide-outline-variant/30 p-0 sm:p-0">
                {documents.rows.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(d.title)}</p>
                      <Muted>
                        {[d.docType ? humanize(d.docType) : null, d.version ? `v${d.version}` : null, formatDate(d.createdAt)].filter(Boolean).join(' · ')}
                      </Muted>
                    </div>
                    <StatusChip value={d.visibility} tone="neutral" />
                  </div>
                ))}
              </Panel>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <SectionTitle>Audit timeline</SectionTitle>
          <Panel>
            {timeline.length ? <Timeline items={timeline} /> : <Muted>No dated events yet.</Muted>}
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ payment detail ------------------------------ */

const VOID_REASON_ID = 'void-reason';

export function PaymentDetailPage() {
  const { paymentId = '' } = useParams();
  const [payment, setPayment] = useState<AnyRow | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const receipts = useAsyncList(() => api.receipts.list(), [paymentId]);
  const bookings = useAsyncList(() => api.bookings.list() as Promise<AnyRow[]>, [paymentId]);
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);

  function load() {
    setLoadErr('');
    api.payments
      .get(paymentId)
      .then((p) => setPayment(p as AnyRow))
      .catch((e) => setLoadErr(errMsg(e)));
  }

  useEffect(() => {
    setPayment(null);
    if (paymentId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const receipt = receipts.rows.find((r) => r.paymentId === paymentId);
  const booking = payment ? bookings.rows.find((b) => b.id === payment.bookingId) : undefined;
  const project = payment ? projects.rows.find((p) => p.id === (payment.projectId ?? booking?.projectId)) : undefined;

  async function doVoid() {
    setVoiding(true);
    setMsg(null);
    try {
      await api.payments.void(paymentId, reason.trim());
      setConfirming(false);
      setReason('');
      setMsg({ tone: 'ok', text: 'Payment voided. It stays on the ledger and is excluded from totals.' });
      load();
    } catch (e) {
      setConfirming(false);
      setMsg({ tone: 'err', text: errMsg(e) });
    } finally {
      setVoiding(false);
    }
  }

  function startVoid() {
    if (reason.trim()) {
      setConfirming(true);
      return;
    }
    const el = document.getElementById(VOID_REASON_ID);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }

  if (loadErr) return <NotFound what="Payment" id={paymentId} back="/payments" backLabel="Back to payments" error={loadErr} onRetry={load} />;
  if (!payment) return <LoadingState label="Loading payment…" />;

  const status = paymentStatus(payment);
  const voided = isVoided(payment);
  const fee = payment.feePaise != null ? toBig(payment.feePaise) : null;
  const gross = toBig(payment.amountPaise);

  const timeline = toTimeline([
    { at: payment.createdAt, title: 'Payment recorded', detail: payment.bookingId ? `Linked to booking ${shortId(payment.bookingId)}` : undefined },
    {
      at: payment.paidAt,
      title: `Payment received via ${humanize(payment.method)}`,
      detail: payment.txnRef ? `Reference ${payment.txnRef}` : undefined,
    },
    ...(receipt ? [{ at: receipt.issuedAt, title: 'Receipt issued', detail: receipt.receiptNumber }] : []),
    ...(voided ? [{ at: payment.voidedAt, title: 'Payment voided', detail: payment.voidReason || undefined }] : []),
  ]);

  return (
    <>
      <BackLink to="/payments">Payments</BackLink>

      <HeroHeader
        eyebrow={<>Payment · <span className="numeric normal-case">{payment.receiptNumber || shortId(payment.id)}</span></>}
        value={<span className={cn(voided && 'text-muted-foreground line-through')}>{formatPaise(payment.amountPaise)}</span>}
        status={<Chip tone={status.tone}>{status.label}</Chip>}
        actions={
          <>
            {!voided ? (
              <Btn variant="danger" onClick={startVoid}>
                <Ban className="h-4 w-4" /> Void
              </Btn>
            ) : null}
            {receipt ? (
              <LinkBtn to={`/receipts/${receipt.id}`} variant="primary">
                <Receipt className="h-4 w-4" /> View receipt
              </LinkBtn>
            ) : null}
          </>
        }
      />

      {msg ? <Notice tone={msg.tone} className="mb-6">{msg.text}</Notice> : null}

      <div className="grid gap-6 pb-12 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7">
          <Panel>
            <SectionTitle>Payment method</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <Fact label="Mode">{humanize(payment.method)}</Fact>
              <Fact label="Reference"><span className="numeric">{display(payment.txnRef)}</span></Fact>
              <Fact label="Paid on"><span className="numeric">{formatDate(payment.paidAt)}</span></Fact>
              <Fact label="Receipt #"><span className="numeric">{display(payment.receiptNumber ?? receipt?.receiptNumber)}</span></Fact>
              <Fact label="Customer">
                {payment.customerId ? (
                  <RecordLink to={`/customers/${payment.customerId}`}>{booking?.customer?.name ?? shortId(payment.customerId)}</RecordLink>
                ) : (
                  DASH
                )}
              </Fact>
              <Fact label="Booking">
                {payment.bookingId ? (
                  <RecordLink to={`/bookings/${payment.bookingId}`} className="numeric">{shortId(payment.bookingId)}</RecordLink>
                ) : (
                  DASH
                )}
              </Fact>
              <Fact label="Plot / Project">
                {[booking?.plot?.number, project?.name].filter(Boolean).join(' · ') || DASH}
              </Fact>
              <Fact label="Reconciliation"><StatusChip value={payment.reconciliationStatus} /></Fact>
            </div>
            {payment.notes ? (
              <div className="pt-6">
                <Fact label="Notes"><span className="font-normal text-muted-foreground">{payment.notes}</span></Fact>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <SectionTitle>Amount</SectionTitle>
            <div className="space-y-3">
              <AmountRow label="Gross amount" value={formatPaise(gross.toString())} strong={fee === null} />
              {fee !== null ? (
                <>
                  <AmountRow label="Processing fee" value={`-${formatPaise(fee.toString())}`} muted />
                  <AmountRow label="Net settled" value={formatPaise((gross - fee).toString())} strong />
                </>
              ) : null}
              {voided ? <AmountRow label="Counted in totals" value="No — voided" muted /> : null}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-5">
          <Panel>
            <SectionTitle>Timeline</SectionTitle>
            <Timeline items={timeline} />
          </Panel>

          <Panel tonal>
            <SectionTitle>Receipt</SectionTitle>
            {receipts.loading ? (
              <Muted>Looking up receipt…</Muted>
            ) : receipt ? (
              <>
                <p className="pb-4 text-sm text-muted-foreground">
                  Receipt <span className="numeric text-foreground">{receipt.receiptNumber}</span> issued {formatDate(receipt.issuedAt)}.
                </p>
                <LinkBtn to={`/receipts/${receipt.id}`} variant="primary">
                  <Receipt className="h-4 w-4" /> View receipt
                </LinkBtn>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {receipts.err ? `Couldn't load receipts: ${receipts.err}` : 'No receipt has been issued for this payment.'}
              </p>
            )}
          </Panel>

          {voided ? (
            <Panel>
              <SectionTitle>Void record</SectionTitle>
              <div className="grid gap-4">
                <Fact label="Voided at"><span className="numeric">{formatDateTime(payment.voidedAt)}</span></Fact>
                <Fact label="Reason">{display(payment.voidReason)}</Fact>
              </div>
            </Panel>
          ) : (
            <Panel>
              <SectionTitle aside="Audited">Void payment</SectionTitle>
              <p className="pb-4 text-sm text-muted-foreground">
                Voided payments stay on the ledger for audit and are excluded from collection totals.
              </p>
              <Field label="Reason" required>
                <TextareaInput id={VOID_REASON_ID} rows={2} value={reason} onChange={setReason} placeholder="e.g. Duplicate entry, bounced cheque" />
              </Field>
              <div className="pt-4">
                <Btn variant="danger" disabled={!reason.trim() || voiding} onClick={() => setConfirming(true)}>
                  <Ban className="h-4 w-4" /> Void payment
                </Btn>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Void this payment?"
        description={`${formatPaise(payment.amountPaise)} will be excluded from totals. Reason: ${reason.trim()}`}
        confirmLabel={voiding ? 'Voiding…' : 'Void payment'}
        cancelLabel="Keep payment"
        busy={voiding}
        onConfirm={() => void doVoid()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/* ------------------------------- agent detail ------------------------------- */

const MONTHS_SHOWN = 12;
const chartTooltip = { background: 'var(--surface-highest)', border: 'none', borderRadius: 8, fontSize: 12 };
const ACTIVE_BOOKING = new Set(['ACTIVE', 'UNDER_DOCUMENTATION', 'COMPLETED']);

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Contiguous months from the agent's first booking (at most the last 12) through now. */
function bookingsByMonth(rows: AnyRow[]) {
  const dated = rows.map((b) => ({ b, t: time(b.bookedAt ?? b.createdAt) })).filter((x) => x.t > 0);
  if (!dated.length) return [];
  const buckets = new Map<string, { bookings: number; valuePaise: bigint }>();
  for (const { b, t } of dated) {
    const k = monthKey(new Date(t));
    const cur = buckets.get(k) ?? { bookings: 0, valuePaise: 0n };
    cur.bookings += 1;
    cur.valuePaise += toBig(b.agreementValuePaise);
    buckets.set(k, cur);
  }
  const latest = new Date(Math.max(Date.now(), ...dated.map((x) => x.t)));
  const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
  const firstT = Math.min(...dated.map((x) => x.t));
  const windowStart = new Date(end.getFullYear(), end.getMonth() - (MONTHS_SHOWN - 1), 1);
  const first = new Date(new Date(firstT).getFullYear(), new Date(firstT).getMonth(), 1);
  const start = first > windowStart ? first : windowStart;

  const out: Array<{ month: string; bookings: number; value: number }> = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const hit = buckets.get(monthKey(d));
    out.push({
      month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      bookings: hit?.bookings ?? 0,
      value: hit ? Number(hit.valuePaise) : 0,
    });
  }
  return out;
}

export function AgentDetailPage() {
  const { agentId = '' } = useParams();
  const agents = useAsyncList(() => api.agents.list(), [agentId]);
  const bookings = useAsyncList(() => api.bookings.list() as Promise<AnyRow[]>, [agentId]);
  const customers = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>, [agentId]);
  const commissions = useAsyncList(() => api.commissions.list(), [agentId]);
  const leads = useAsyncList(() => api.leads.list() as Promise<AnyRow[]>, [agentId]);
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);

  const agent = agents.rows.find((a) => String(a.id) === agentId);
  const agentBookings = useMemo(() => bookings.rows.filter((b) => (b.agentId ?? b.agent?.id) === agentId), [bookings.rows, agentId]);
  const agentCustomers = useMemo(() => customers.rows.filter((c) => c.agentId === agentId), [customers.rows, agentId]);
  const agentCommissions = useMemo(() => commissions.rows.filter((c) => (c.agentId ?? c.agent?.id) === agentId), [commissions.rows, agentId]);
  const agentLeads = useMemo(() => leads.rows.filter((l) => l.agentId === agentId), [leads.rows, agentId]);

  const monthly = useMemo(() => bookingsByMonth(agentBookings), [agentBookings]);
  const salesPaise = sumPaise(agentBookings.filter((b) => ACTIVE_BOOKING.has(String(b.state).toUpperCase())), 'agreementValuePaise');
  const activeCount = agentBookings.filter((b) => String(b.state).toUpperCase() === 'ACTIVE').length;
  const commissionTotal = sumPaise(agentCommissions, 'amountPaise');
  const commissionPaid = sumPaise(agentCommissions.filter((c) => String(c.status).toUpperCase() === 'PAID'), 'amountPaise');
  const commissionByStatus = useMemo(() => {
    const m = new Map<string, bigint>();
    for (const c of agentCommissions) {
      const k = humanize(c.status);
      m.set(k, (m.get(k) ?? 0n) + toBig(c.amountPaise));
    }
    return Array.from(m.entries());
  }, [agentCommissions]);

  const assignedProjects = useMemo(() => {
    const counts = new Map<string, { bookings: number; leads: number }>();
    for (const b of agentBookings) {
      if (!b.projectId) continue;
      const c = counts.get(b.projectId) ?? { bookings: 0, leads: 0 };
      c.bookings += 1;
      counts.set(b.projectId, c);
    }
    for (const l of agentLeads) {
      if (!l.projectId) continue;
      const c = counts.get(l.projectId) ?? { bookings: 0, leads: 0 };
      c.leads += 1;
      counts.set(l.projectId, c);
    }
    return Array.from(counts.entries()).map(([id, c]) => ({ id, ...c, project: projects.rows.find((p) => p.id === id) }));
  }, [agentBookings, agentLeads, projects.rows]);

  if (agents.loading) return <LoadingState label="Loading agent…" />;
  if (agents.err || !agent) {
    return <NotFound what="Agent" id={agentId} back="/agents" backLabel="Back to agents" error={agents.err} onRetry={agents.reload} />;
  }

  const metricsLoading = bookings.loading || customers.loading || commissions.loading;

  return (
    <>
      <BackLink to="/agents">All agents</BackLink>

      <RecordHeader
        eyebrow="Agent"
        title={display(agent.name)}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="numeric flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-c px-2 text-[10px] font-semibold">
              {display(agent.code)}
            </span>
            {[agent.region, agent.phone].filter(Boolean).join(' · ') || 'No region or phone on file'}
          </span>
        }
        facts={[
          { label: 'Code', value: <span className="numeric">{display(agent.code)}</span> },
          { label: 'Status', value: <StatusChip value={agent.status} /> },
          { label: 'Region', value: display(agent.region) },
          { label: 'Projects', value: String(assignedProjects.length) },
        ]}
      />

      {bookings.err || customers.err || commissions.err ? (
        <Notice tone="err" className="mt-6">
          Some figures are incomplete: {[bookings.err, customers.err, commissions.err].filter(Boolean).join(' · ')}
        </Notice>
      ) : null}

      <div className="pt-6">
        {metricsLoading ? (
          <LoadingState variant="metrics" rows={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Bookings" value={agentBookings.length} hint={`${activeCount} active`} />
            <Metric accent label="Sales" value={formatPaise(salesPaise.toString())} hint="Agreement value, excl. cancelled" />
            <Metric label="Customers" value={agentCustomers.length} hint={`${agentLeads.length} leads`} />
            <Metric label="Commissions" value={formatPaise(commissionTotal.toString())} hint={`${formatPaise(commissionPaid.toString())} paid`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 pt-6 pb-12 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <Panel>
            <SectionTitle aside={monthly.length ? `Last ${monthly.length} month${monthly.length === 1 ? '' : 's'}` : undefined}>
              Monthly bookings trend
            </SectionTitle>
            {bookings.loading ? (
              <LoadingState variant="rows" rows={3} />
            ) : monthly.length === 0 ? (
              <EmptyState compact title="No bookings yet" description="Bookings attributed to this agent will chart here by month." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--outline-variant)" width={32} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Line type="monotone" dataKey="bookings" name="Bookings" stroke="var(--primary)" strokeWidth={2} dot={monthly.length < 3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <div>
            <SectionTitle aside={customers.loading ? undefined : `${agentCustomers.length} assigned`}>Customers</SectionTitle>
            {customers.err ? (
              <ErrorState compact title="Couldn't load customers" error={customers.err} onRetry={customers.reload} />
            ) : customers.loading ? (
              <LoadingState variant="rows" rows={3} />
            ) : (
              <DataTable<Row>
                rows={withIds(agentCustomers)}
                linkTo={(c) => `/customers/${c.id}`}
                emptyMessage="No customers assigned to this agent."
                columns={[
                  { key: 'name', header: 'Customer', cell: (c) => <span className="text-sm font-medium">{display(c.name)}</span> },
                  { key: 'phone', header: 'Phone', cell: (c) => <Mono>{display(c.phone)}</Mono> },
                  { key: 'city', header: 'City', cell: (c) => <Muted>{display(c.city)}</Muted> },
                  { key: 'kyc', header: 'KYC', cell: (c) => <StatusChip value={c.kycStatus} /> },
                ]}
              />
            )}
          </div>

          <div>
            <SectionTitle aside={bookings.loading ? undefined : `${agentBookings.length} total`}>Bookings</SectionTitle>
            {bookings.err ? (
              <ErrorState compact title="Couldn't load bookings" error={bookings.err} onRetry={bookings.reload} />
            ) : bookings.loading ? (
              <LoadingState variant="rows" rows={3} />
            ) : (
              <DataTable<Row>
                rows={withIds(agentBookings)}
                linkTo={(b) => `/bookings/${b.id}`}
                emptyMessage="No bookings attributed to this agent."
                columns={[
                  { key: 'id', header: 'Booking', cell: (b) => <Mono className="font-medium">{shortId(b.id)}</Mono> },
                  { key: 'plot', header: 'Plot', cell: (b) => <Mono>{display(b.plot?.number ?? shortId(b.plotId))}</Mono> },
                  { key: 'customer', header: 'Customer', cell: (b) => <Muted>{display(b.customer?.name ?? shortId(b.customerId))}</Muted> },
                  { key: 'date', header: 'Date', cell: (b) => <Mono className="text-muted-foreground">{formatDate(b.bookedAt ?? b.createdAt)}</Mono> },
                  { key: 'state', header: 'Stage', cell: (b) => <StatusChip value={b.state} /> },
                  { key: 'amount', header: 'Amount', align: 'right', cell: (b) => <Mono>{formatPaise(b.agreementValuePaise)}</Mono> },
                ]}
              />
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-4">
          <Panel tonal>
            <SectionTitle>Assigned projects</SectionTitle>
            <div className="space-y-3">
              {assignedProjects.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block rounded-lg bg-surface-low p-3 transition-colors hover:bg-surface-c">
                  <p className="text-sm font-medium">{p.project?.name ?? shortId(p.id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.project?.location, p.project?.city].filter(Boolean).join(' · ') || display(p.project?.code)}
                  </p>
                  <p className="numeric pt-1 text-xs text-muted-foreground">
                    {p.bookings} booking{p.bookings === 1 ? '' : 's'} · {p.leads} lead{p.leads === 1 ? '' : 's'}
                  </p>
                </Link>
              ))}
              {assignedProjects.length === 0 && !bookings.loading && !leads.loading ? (
                <p className="text-xs text-muted-foreground">No projects from this agent's bookings or leads yet.</p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Sales value by month</SectionTitle>
            {monthly.length === 0 ? (
              <Muted>No bookings to chart.</Muted>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--outline-variant)" />
                    <Tooltip contentStyle={chartTooltip} formatter={(v) => [formatPaise(v as number), 'Agreement value']} />
                    <Bar dataKey="value" name="Agreement value" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle aside={<Link to="/commissions" className="hover:text-foreground">All commissions</Link>}>Commissions</SectionTitle>
            {commissions.loading ? (
              <Muted>Loading…</Muted>
            ) : commissionByStatus.length === 0 ? (
              <Muted>No commissions accrued yet.</Muted>
            ) : (
              <div className="space-y-3">
                {commissionByStatus.map(([label, amount]) => (
                  <AmountRow key={label} label={label} value={formatPaise(amount.toString())} />
                ))}
                <AmountRow label="Total" value={formatPaise(commissionTotal.toString())} strong />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
