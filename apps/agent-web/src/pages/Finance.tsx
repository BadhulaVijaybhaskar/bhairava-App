import { useMemo } from 'react';
import { Trophy, Wallet } from 'lucide-react';
import { Chip, Metric, PageHeader, type DataTableColumn } from '@bhairava/ui-web';
import { api } from '../api';
import { RecordList } from '../components/RecordList';
import { useRows, type Row } from '../lib/data';
import { formatDate, formatPaise, humanize, shortRef, text } from '../lib/format';

function sumPaise(rows: Row[], key: string, include: (r: Row) => boolean = () => true) {
  return rows.reduce((total, r) => (include(r) ? total + (Number(r[key]) || 0) : total), 0);
}

const SETTLED_INSTALLMENTS = new Set(['PAID', 'WAIVED']);

export function CollectionsPage() {
  const schedules = useRows(() => api.paymentSchedules.list());
  const summary = useMemo(
    () => ({
      outstanding: sumPaise(schedules.rows, 'amountDuePaise', (r) => !SETTLED_INSTALLMENTS.has(String(r.status))),
      overdue: schedules.rows.filter((r) => r.status === 'OVERDUE').length,
    }),
    [schedules.rows],
  );
  const columns: DataTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Installment',
      cell: (r) => (
        <span className="min-w-0">
          <span className="block truncate font-medium">{text(r.name)}</span>
          {r.installmentNumber ? <span className="block text-xs text-muted-foreground">#{r.installmentNumber}</span> : null}
        </span>
      ),
    },
    { key: 'due', header: 'Due', cell: (r) => <span className="numeric">{formatDate(r.dueDate)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <span className="numeric">{formatPaise(r.amountDuePaise)}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Chip>{humanize(r.status)}</Chip> },
    { key: 'booking', header: 'Booking', cell: (r) => <span className="numeric text-xs text-muted-foreground">{shortRef(r.bookingId)}</span> },
  ];
  const loadingValue = schedules.loading ? '—' : null;

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Collections" description="Payment schedules on bookings you are responsible for." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric label="Installments" value={loadingValue ?? schedules.rows.length} size="sm" />
        <Metric label="Outstanding" value={loadingValue ?? formatPaise(summary.outstanding)} size="sm" accent />
        <Metric label="Overdue" value={loadingValue ?? summary.overdue} size="sm" className="col-span-2 lg:col-span-1" />
      </div>
      <RecordList
        state={schedules}
        columns={columns}
        emptyIcon={Wallet}
        emptyTitle="No payment schedules"
        emptyDescription="Schedules appear once your bookings have installment plans."
      />
    </div>
  );
}

export function CommissionsPage() {
  const commissions = useRows(() => api.commissions.list());
  const summary = useMemo(
    () => ({
      total: sumPaise(commissions.rows, 'amountPaise'),
      pending: sumPaise(commissions.rows, 'amountPaise', (r) => r.status !== 'PAID'),
      paid: sumPaise(commissions.rows, 'amountPaise', (r) => r.status === 'PAID'),
    }),
    [commissions.rows],
  );
  const columns: DataTableColumn<Row>[] = [
    { key: 'amount', header: 'Amount', cell: (r) => <span className="numeric font-medium">{formatPaise(r.amountPaise)}</span> },
    { key: 'status', header: 'Status', cell: (r) => <Chip>{humanize(r.status)}</Chip> },
    { key: 'booking', header: 'Booking', cell: (r) => <span className="numeric text-xs text-muted-foreground">{shortRef(r.bookingId)}</span> },
    { key: 'updated', header: 'Last change', cell: (r) => <span className="numeric">{formatDate(r.paidAt ?? r.approvedAt ?? r.earnedAt ?? r.createdAt)}</span> },
  ];
  const loadingValue = commissions.loading ? '—' : null;

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Commissions" description="Commission earned on your bookings." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Metric label="Total" value={loadingValue ?? formatPaise(summary.total)} size="sm" accent />
        <Metric label="Awaiting payout" value={loadingValue ?? formatPaise(summary.pending)} size="sm" />
        <Metric label="Paid" value={loadingValue ?? formatPaise(summary.paid)} size="sm" className="col-span-2 lg:col-span-1" />
      </div>
      <RecordList
        state={commissions}
        columns={columns}
        emptyIcon={Trophy}
        emptyTitle="No commissions yet"
        emptyDescription="Commissions are recorded when your bookings progress."
      />
    </div>
  );
}
