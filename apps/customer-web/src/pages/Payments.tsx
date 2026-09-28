import { CalendarClock, CreditCard, Receipt } from 'lucide-react';
import { Chip, DataTable, EmptyState, LinkBtn, Metric, PageHeader, type DataTableColumn } from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection } from '../components';
import { formatDate, formatPaise, humanize, paymentMethodLabel, sumPaise } from '../lib/format';
import { installmentTone } from '../lib/status';
import type { CustomerPayment, ScheduleItem } from '../lib/types';
import { useApi } from '../lib/use-api';

export function PaymentsPage() {
  const state = useApi(() => api.payments.list() as Promise<CustomerPayment[]>);

  const columns: DataTableColumn<CustomerPayment>[] = [
    { key: 'paidAt', header: 'Paid on', cell: (p) => <span className="numeric font-medium">{formatDate(p.paidAt)}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (p) => (
        <span className={p.voidedAt ? 'numeric text-muted-foreground line-through' : 'numeric font-medium'}>
          {formatPaise(p.amountPaise)}
        </span>
      ),
    },
    { key: 'method', header: 'Method', cell: (p) => paymentMethodLabel(p.method) },
    { key: 'ref', header: 'Reference', cell: (p) => <span className="numeric text-muted-foreground">{p.txnRef || '—'}</span> },
    { key: 'receipt', header: 'Receipt', cell: (p) => <span className="numeric">{p.receiptNumber || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => (p.voidedAt ? <Chip tone="danger">Voided</Chip> : <Chip tone="positive">Received</Chip>),
    },
  ];

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Payments"
        title="Payments"
        description="Every payment recorded against your bookings. Receipts are issued for each one."
        actions={<LinkBtn to="/receipts" variant="tonal"><Receipt className="h-4 w-4" /> View receipts</LinkBtn>}
      />
      <AsyncSection state={state}>
        {(rows) => {
          const valid = rows.filter((p) => !p.voidedAt);
          if (rows.length === 0) {
            return (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Payments you make towards your bookings will be listed here."
                action={<LinkBtn to="/schedules" variant="tonal">See payment schedule</LinkBtn>}
              />
            );
          }
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                <Metric accent label="Total paid" value={formatPaise(sumPaise(valid.map((p) => p.amountPaise)))} />
                <Metric label="Payments" value={valid.length} />
                <Metric label="Last payment" size="sm" value={formatDate(valid[0]?.paidAt)} />
              </div>
              <DataTable rows={rows} columns={columns} />
            </div>
          );
        }}
      </AsyncSection>
    </div>
  );
}

export function SchedulesPage() {
  const state = useApi(() => api.paymentSchedules.list() as unknown as Promise<ScheduleItem[]>);

  const columns: DataTableColumn<ScheduleItem>[] = [
    {
      key: 'name',
      header: 'Instalment',
      cell: (s) => (
        <span className="font-medium">
          {s.installmentNumber != null ? <span className="numeric pr-2 text-muted-foreground">{s.installmentNumber}.</span> : null}
          {s.name}
        </span>
      ),
    },
    { key: 'due', header: 'Due date', cell: (s) => <span className="numeric">{formatDate(s.dueDate)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (s) => <span className="numeric">{formatPaise(s.amountDuePaise)}</span> },
    { key: 'status', header: 'Status', cell: (s) => <Chip tone={installmentTone(s.status)}>{humanize(s.status)}</Chip> },
  ];

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Payments"
        title="Payment schedule"
        description="Your instalment plan, in due-date order, so you always know what’s coming up next."
      />
      <AsyncSection state={state}>
        {(rows) => {
          if (rows.length === 0) {
            return (
              <EmptyState
                icon={CalendarClock}
                title="No schedule yet"
                description="Once your instalment plan is set up, due dates and amounts will appear here."
              />
            );
          }
          const open = rows.filter((s) => s.status !== 'PAID' && s.status !== 'WAIVED');
          const next = open[0];
          const overdue = rows.filter((s) => s.status === 'OVERDUE').length;
          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                <Metric
                  accent
                  label="Next due"
                  value={next ? formatPaise(next.amountDuePaise) : 'All clear'}
                  hint={next ? `${next.name} · ${formatDate(next.dueDate)}` : 'Nothing outstanding'}
                />
                <Metric label="Remaining" value={formatPaise(sumPaise(open.map((s) => s.amountDuePaise)))} hint={`${open.length} instalments`} />
                <Metric
                  label="Overdue"
                  value={overdue}
                  hint={overdue ? 'Please reach out if you need help' : 'You’re on track'}
                />
              </div>
              <DataTable rows={rows} columns={columns} />
            </div>
          );
        }}
      </AsyncSection>
    </div>
  );
}
