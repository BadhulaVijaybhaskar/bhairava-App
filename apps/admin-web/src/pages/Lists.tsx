import { BadgePlus, CalendarPlus, Clock, Receipt, Workflow } from 'lucide-react';
import { LinkBtn } from '@bhairava/ui-web';
import { api } from '../api';
import { Muted, StatusChip } from '../components/common';
import { shortId, type AnyRow } from '../lib/data';
import { ResourceTable } from './ResourceList';

function nameOr(label: unknown, id: unknown) {
  return label ? String(label) : shortId(id);
}

const conversionLink = (
  <LinkBtn to="/conversion" variant="tonal">
    <Workflow className="h-4 w-4" /> Lead conversion
  </LinkBtn>
);

export function LeadsPage() {
  return (
    <ResourceTable
      eyebrow="Sales"
      title="Leads"
      description="Every enquiry captured by agents and walk-ins, by pipeline stage."
      loader={() => api.leads.list() as Promise<AnyRow[]>}
      statusKey="stage"
      actions={conversionLink}
      columns={[
        { key: 'name', label: 'Lead', kind: 'strong' },
        { key: 'phone', label: 'Phone', kind: 'mono' },
        { key: 'source', label: 'Source', kind: 'muted' },
        { key: 'stage', label: 'Stage', kind: 'status' },
        { key: 'createdAt', label: 'Created', kind: 'date' },
      ]}
    />
  );
}

export function VisitsPage() {
  return (
    <ResourceTable
      eyebrow="Sales"
      title="Site visits"
      description="Scheduled and completed project walkthroughs."
      loader={() => api.visits.list() as Promise<AnyRow[]>}
      statusKey="status"
      actions={
        <LinkBtn to="/onboarding/visit" variant="primary">
          <CalendarPlus className="h-4 w-4" /> Schedule visit
        </LinkBtn>
      }
      columns={[
        { key: 'scheduledAt', label: 'When', kind: 'datetime' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'notes', label: 'Notes', kind: 'muted' },
        { key: 'id', label: 'Visit', kind: 'id' },
      ]}
    />
  );
}

export function ReservationsPage() {
  return (
    <ResourceTable
      eyebrow="Sales"
      title="Reservations"
      description="Time-boxed plot holds. Expired holds release inventory automatically."
      loader={() => api.reservations.list() as Promise<AnyRow[]>}
      statusKey="state"
      actions={
        <LinkBtn to="/onboarding/reservation" variant="primary">
          <Clock className="h-4 w-4" /> New reservation
        </LinkBtn>
      }
      columns={[
        { key: 'id', label: 'Reservation', kind: 'id' },
        { key: 'state', label: 'State', kind: 'status' },
        { key: 'plotId', label: 'Plot', render: (r) => <span className="numeric text-xs">{nameOr(r.plot?.number, r.plotId)}</span> },
        { key: 'customerId', label: 'Customer', render: (r) => <Muted>{nameOr(r.customer?.name, r.customerId)}</Muted> },
        { key: 'expiresAt', label: 'Expires', kind: 'datetime' },
      ]}
    />
  );
}

export function BookingsPage() {
  return (
    <ResourceTable
      eyebrow="Sales"
      title="Bookings"
      description="Confirmed plot bookings and their agreement values."
      loader={() => api.bookings.list() as Promise<AnyRow[]>}
      statusKey="state"
      linkTo={(r) => `/bookings/${r.id}`}
      actions={
        <LinkBtn to="/onboarding/booking" variant="primary">
          <Receipt className="h-4 w-4" /> New booking
        </LinkBtn>
      }
      columns={[
        { key: 'id', label: 'Booking', kind: 'id' },
        { key: 'state', label: 'State', kind: 'status' },
        { key: 'plotId', label: 'Plot', render: (r) => <span className="numeric text-xs">{nameOr(r.plot?.number, r.plotId)}</span> },
        { key: 'customerId', label: 'Customer', render: (r) => <Muted>{nameOr(r.customer?.name, r.customerId)}</Muted> },
        { key: 'agentId', label: 'Agent', render: (r) => <Muted>{nameOr(r.agent?.name, r.agentId)}</Muted> },
        { key: 'agreementValuePaise', label: 'Agreement', kind: 'money' },
      ]}
    />
  );
}

export function PaymentsPage() {
  return (
    <ResourceTable
      eyebrow="Finance"
      title="Payments"
      description="Recorded payments. Voided payments stay on the ledger and are excluded from totals."
      loader={() => api.payments.list() as Promise<AnyRow[]>}
      linkTo={(r) => `/payments/${r.id}`}
      columns={[
        { key: 'paidAt', label: 'Paid', kind: 'date' },
        { key: 'amountPaise', label: 'Amount', kind: 'money' },
        { key: 'method', label: 'Method', render: (r) => <StatusChip value={r.method} tone="neutral" /> },
        { key: 'status', label: 'Status', render: (r) => <StatusChip value={r.status || (r.voidedAt ? 'Voided' : 'Recorded')} tone={r.voidedAt ? 'danger' : undefined} /> },
        { key: 'bookingId', label: 'Booking', kind: 'id' },
        { key: 'id', label: 'Payment', kind: 'id' },
      ]}
    />
  );
}

function scheduleLoader(sortByDue: boolean) {
  return async () => {
    const rows = await api.paymentSchedules.list();
    if (!sortByDue || !Array.isArray(rows)) return rows;
    return [...rows].sort((a, b) => String(a.dueDate ?? '').localeCompare(String(b.dueDate ?? '')));
  };
}

const scheduleColumns = [
  { key: 'name', label: 'Instalment', kind: 'strong' as const },
  { key: 'dueDate', label: 'Due', kind: 'date' as const },
  { key: 'amountDuePaise', label: 'Amount', kind: 'money' as const },
  { key: 'status', label: 'Status', kind: 'status' as const },
  { key: 'bookingId', label: 'Booking', kind: 'id' as const },
];

export function CollectionsPage() {
  return (
    <ResourceTable
      eyebrow="Finance"
      title="Collections"
      description="Instalment schedules across bookings and their collection status."
      loader={scheduleLoader(false)}
      statusKey="status"
      searchKeys={['name', 'status', 'bookingId']}
      columns={scheduleColumns}
    />
  );
}

export function SchedulePage() {
  return (
    <ResourceTable
      eyebrow="Finance"
      title="Payment schedule"
      description="Upcoming and overdue instalments, ordered by due date."
      loader={scheduleLoader(true)}
      statusKey="status"
      searchKeys={['name', 'status', 'bookingId']}
      columns={scheduleColumns}
    />
  );
}

export function CommissionsPage() {
  return (
    <ResourceTable
      eyebrow="Finance"
      title="Commissions"
      description="Agent commissions accrued on bookings."
      loader={() => api.commissions.list()}
      statusKey="status"
      columns={[
        { key: 'id', label: 'Commission', kind: 'id' },
        { key: 'agentId', label: 'Agent', render: (r) => <Muted>{nameOr(r.agent?.name, r.agentId)}</Muted> },
        { key: 'amountPaise', label: 'Amount', kind: 'money' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'bookingId', label: 'Booking', kind: 'id' },
      ]}
    />
  );
}

export function RegistrationsPage() {
  return (
    <ResourceTable
      eyebrow="Operations"
      title="Registrations"
      description="Sale-deed registrations with the sub-registrar."
      loader={() => api.registrations.list()}
      statusKey="status"
      columns={[
        { key: 'id', label: 'Registration', kind: 'id' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'deedNumber', label: 'Deed #', kind: 'mono' },
        { key: 'registeredAt', label: 'Registered', kind: 'date' },
      ]}
    />
  );
}

export function ResalePage() {
  return (
    <ResourceTable
      eyebrow="Operations"
      title="Resale listings"
      description="Owner-initiated resale listings and their asking prices."
      loader={() => api.resales.list()}
      statusKey="status"
      columns={[
        { key: 'id', label: 'Listing', kind: 'id' },
        { key: 'status', label: 'Status', kind: 'status' },
        { key: 'askingPricePaise', label: 'Asking', kind: 'money' },
        { key: 'plotId', label: 'Plot', render: (r) => <span className="numeric text-xs">{nameOr(r.plot?.number, r.plotId)}</span> },
        { key: 'customerId', label: 'Owner', render: (r) => <Muted>{nameOr(r.customer?.name, r.customerId)}</Muted> },
      ]}
    />
  );
}

export function AgentsPage() {
  return (
    <ResourceTable
      eyebrow="Sales"
      title="Agents"
      description="Channel partners and in-house sales agents."
      loader={() => api.agents.list()}
      statusKey="status"
      linkTo={(r) => `/agents/${r.id}`}
      actions={
        <LinkBtn to="/onboarding/agent" variant="primary">
          <BadgePlus className="h-4 w-4" /> Onboard agent
        </LinkBtn>
      }
      columns={[
        { key: 'code', label: 'Code', kind: 'mono' },
        { key: 'name', label: 'Agent', kind: 'strong' },
        { key: 'phone', label: 'Phone', kind: 'mono' },
        { key: 'region', label: 'Region', kind: 'muted' },
        { key: 'status', label: 'Status', kind: 'status' },
      ]}
    />
  );
}
