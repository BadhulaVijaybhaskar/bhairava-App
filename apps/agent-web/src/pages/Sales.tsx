import { BadgePlus, CalendarClock, Clock, Receipt, Users } from 'lucide-react';
import { Chip, NewRecordButton, PageHeader, type DataTableColumn } from '@bhairava/ui-web';
import { api } from '../api';
import { CustomerCell, RecordList, Restricted } from '../components/RecordList';
import { useProjectNames, useRows, type Row } from '../lib/data';
import { formatDate, formatDateTime, formatPaise, humanize, shortRef, text } from '../lib/format';

export function LeadsPage() {
  const leads = useRows(() => api.leads.list());
  const projectNames = useProjectNames();
  const columns: DataTableColumn<Row>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{text(r.name)}</span> },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="numeric">{text(r.phone)}</span> },
    { key: 'project', header: 'Project', cell: (r) => (r.projectId ? projectNames.get(r.projectId) ?? '—' : '—') },
    { key: 'source', header: 'Source', cell: (r) => (r.source ? humanize(r.source) : '—') },
    { key: 'stage', header: 'Stage', cell: (r) => <Chip>{humanize(r.stage)}</Chip> },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="My leads"
        description="Leads assigned to you, newest first."
        actions={<NewRecordButton to="/leads/new">New lead</NewRecordButton>}
      />
      <RecordList
        state={leads}
        columns={columns}
        emptyIcon={BadgePlus}
        emptyTitle="No leads yet"
        emptyAction={<NewRecordButton to="/leads/new">Add your first lead</NewRecordButton>}
        testId="agent-leads"
      />
    </div>
  );
}

export function CustomersPage() {
  const customers = useRows(() => api.customers.list());
  const columns: DataTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (r) => (r.redacted ? <Restricted reason={r.reason} /> : <span className="font-medium">{text(r.name)}</span>),
    },
    { key: 'phone', header: 'Phone', cell: (r) => (r.redacted ? '—' : <span className="numeric">{text(r.phone)}</span>) },
    { key: 'email', header: 'Email', cell: (r) => (r.redacted ? '—' : text(r.email)) },
    { key: 'city', header: 'City', cell: (r) => (r.redacted ? '—' : text(r.city)) },
    { key: 'kyc', header: 'KYC', cell: (r) => (r.kycStatus ? <Chip>{humanize(r.kycStatus)}</Chip> : '—') },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Customers"
        description="Customers you onboarded or own. Details of other agents' customers stay hidden."
        actions={<NewRecordButton to="/customers/onboarding">Onboard customer</NewRecordButton>}
      />
      <RecordList
        state={customers}
        columns={columns}
        emptyIcon={Users}
        emptyTitle="No customers yet"
        emptyAction={<NewRecordButton to="/customers/onboarding">Onboard a customer</NewRecordButton>}
        testId="agent-customers"
      />
    </div>
  );
}

export function VisitsPage() {
  const visits = useRows(() => api.visits.list());
  const projectNames = useProjectNames();
  const columns: DataTableColumn<Row>[] = [
    { key: 'when', header: 'When', cell: (r) => <span className="numeric font-medium">{formatDateTime(r.scheduledAt)}</span> },
    { key: 'project', header: 'Project', cell: (r) => projectNames.get(r.projectId) ?? '—' },
    { key: 'status', header: 'Status', cell: (r) => <Chip>{humanize(r.status)}</Chip> },
    { key: 'notes', header: 'Notes', cell: (r) => <span className="line-clamp-2 text-muted-foreground">{text(r.notes)}</span> },
    { key: 'ref', header: 'Ref', cell: (r) => <span className="numeric text-xs text-muted-foreground">{shortRef(r.id)}</span> },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Site visits"
        description="Visits you scheduled or were assigned."
        actions={<NewRecordButton to="/visits/new">Schedule visit</NewRecordButton>}
      />
      <RecordList
        state={visits}
        columns={columns}
        emptyIcon={CalendarClock}
        emptyTitle="No site visits"
        emptyAction={<NewRecordButton to="/visits/new">Schedule a visit</NewRecordButton>}
      />
    </div>
  );
}

export function ReservationsPage() {
  const reservations = useRows(() => api.reservations.list());
  const columns: DataTableColumn<Row>[] = [
    { key: 'plot', header: 'Plot', cell: (r) => <span className="numeric font-medium">{text(r.plot?.number ?? r.plotId)}</span> },
    { key: 'customer', header: 'Customer', cell: (r) => <CustomerCell customer={r.customer} fallbackId={r.customerId} /> },
    { key: 'state', header: 'State', cell: (r) => <Chip>{humanize(r.state)}</Chip> },
    { key: 'expires', header: 'Expires', cell: (r) => <span className="numeric">{formatDateTime(r.expiresAt)}</span> },
    { key: 'ref', header: 'Ref', cell: (r) => <span className="numeric text-xs text-muted-foreground">{shortRef(r.id)}</span> },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Reservations"
        description="Plot holds you placed. Reserve plots from a project's availability table."
      />
      <RecordList
        state={reservations}
        columns={columns}
        emptyIcon={Clock}
        emptyTitle="No reservations"
        emptyDescription="Reserve an available plot from a project to hold it for a customer."
      />
    </div>
  );
}

export function BookingsPage() {
  const bookings = useRows(() => api.bookings.list());
  const columns: DataTableColumn<Row>[] = [
    { key: 'plot', header: 'Plot', cell: (r) => <span className="numeric font-medium">{text(r.plot?.number ?? r.plotId)}</span> },
    {
      key: 'customer',
      header: 'Customer',
      cell: (r) => <CustomerCell customer={r.customer} fallbackId={r.customer?.redacted ? undefined : r.customerId} />,
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (r) => text(r.responsibleAgent?.code || r.agent?.code || r.agentId),
    },
    { key: 'state', header: 'State', cell: (r) => <Chip>{humanize(r.state)}</Chip> },
    { key: 'agreement', header: 'Agreement', align: 'right', cell: (r) => <span className="numeric">{formatPaise(r.agreementValuePaise)}</span> },
    { key: 'booked', header: 'Booked', cell: (r) => <span className="numeric">{formatDate(r.bookedAt ?? r.createdAt)}</span> },
  ];
  return (
    <div>
      <PageHeader eyebrow="Sales" title="Bookings" description="Bookings attributed to you." />
      <RecordList
        state={bookings}
        columns={columns}
        emptyIcon={Receipt}
        emptyTitle="No bookings"
        emptyDescription="Book a plot from a project's availability table."
      />
    </div>
  );
}
