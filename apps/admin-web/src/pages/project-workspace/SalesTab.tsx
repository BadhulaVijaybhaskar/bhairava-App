import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { DataTable, ErrorState, LoadingState, Metric, Panel, SectionTitle, type DataTableColumn } from '@bhairava/ui-web';
import { api } from '../../api';
import { Mono, Muted, StatusChip } from '../../components/common';
import {
  DASH,
  display,
  formatDate,
  formatDateTime,
  formatPaise,
  humanize,
  shortId,
  sumPaise,
  useAsyncList,
  withIds,
  type AnyRow,
} from '../../lib/data';

type Row = AnyRow & { id: string | number };
type AsyncList = { rows: AnyRow[]; loading: boolean; err: string; reload: () => void };

const LEAD_STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT_PLANNED',
  'SITE_VISIT_COMPLETED',
  'INTERESTED',
  'NEGOTIATION',
  'RESERVED',
  'BOOKED',
  'LOST',
] as const;
const CLOSED_LEAD = new Set(['BOOKED', 'LOST']);
const LIVE_RESERVATION = new Set(['ACTIVE', 'EXPIRING_TODAY']);
const PREVIEW = 8;

const upper = (v: unknown) => String(v ?? '').toUpperCase();
const count = (l: AsyncList) => (l.loading ? DASH : l.err ? '!' : l.rows.length);

function Section({
  title,
  to,
  list,
  columns,
  empty,
  linkTo,
}: {
  title: string;
  to: string;
  list: AsyncList;
  columns: DataTableColumn<Row>[];
  empty: string;
  linkTo?: (row: Row) => string | null;
}) {
  const aside: ReactNode = (
    <Link to={to} className="inline-flex items-center gap-1 hover:text-foreground">
      {list.loading || list.err ? 'Open' : `${list.rows.length} total`} <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
  return (
    <div className="min-w-0">
      <SectionTitle aside={aside}>{title}</SectionTitle>
      {list.err ? (
        <ErrorState compact title={`Couldn't load ${title.toLowerCase()}`} error={list.err} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState variant="rows" rows={3} />
      ) : (
        <DataTable<Row> rows={withIds(list.rows.slice(0, PREVIEW))} columns={columns} emptyMessage={empty} {...(linkTo ? { linkTo } : {})} />
      )}
    </div>
  );
}

export function SalesTab({ projectId, bookings }: { projectId: string; bookings: AsyncList }) {
  const leads = useAsyncList(() => api.leads.list(projectId) as Promise<AnyRow[]>, [projectId]);
  const visits = useAsyncList(() => api.visits.list(projectId) as Promise<AnyRow[]>, [projectId]);
  const reservations = useAsyncList(() => api.reservations.list({ projectId }) as Promise<AnyRow[]>, [projectId]);

  const now = Date.now();
  const leadName = new Map(leads.rows.map((l) => [String(l.id), l.name as string]));
  const openLeads = leads.rows.filter((l) => !CLOSED_LEAD.has(upper(l.stage))).length;
  const lostLeads = leads.rows.filter((l) => upper(l.stage) === 'LOST').length;
  const upcomingVisits = visits.rows.filter((v) => upper(v.status) === 'SCHEDULED' && new Date(String(v.scheduledAt)).getTime() >= now).length;
  const completedVisits = visits.rows.filter((v) => upper(v.status) === 'COMPLETED').length;
  const liveReservations = reservations.rows.filter((r) => LIVE_RESERVATION.has(upper(r.state)));
  const expiringSoon = liveReservations.filter((r) => {
    const t = new Date(String(r.expiresAt)).getTime();
    return t >= now && t - now <= 86_400_000;
  }).length;
  const openBookings = bookings.rows.filter((b) => upper(b.state) !== 'CANCELLED');
  const stageCounts = LEAD_STAGES.map((s) => ({ stage: s, n: leads.rows.filter((l) => upper(l.stage) === s).length })).filter((s) => s.n > 0);

  const links = [
    { to: '/conversion', label: 'Conversion chain', hint: 'Lead → visit → reserve → book' },
    { to: `/projects/${projectId}/plots`, label: 'Plots', hint: 'Reserve or book inventory' },
    { to: '/onboarding/visit', label: 'Schedule visit', hint: 'Book a site walkthrough' },
    { to: '/onboarding/booking', label: 'New booking', hint: 'Agreement, advance and schedule' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric accent label="Leads" value={count(leads)} hint={leads.loading || leads.err ? undefined : `${openLeads} open · ${lostLeads} lost`} />
        <Metric label="Site visits" value={count(visits)} hint={visits.loading || visits.err ? undefined : `${upcomingVisits} upcoming · ${completedVisits} done`} />
        <Metric
          label="Active reservations"
          value={reservations.loading ? DASH : reservations.err ? '!' : liveReservations.length}
          hint={reservations.loading || reservations.err ? undefined : `${expiringSoon} expiring within 24h`}
        />
        <Metric
          label="Bookings"
          value={bookings.loading ? DASH : bookings.err ? '!' : openBookings.length}
          hint={bookings.loading || bookings.err ? undefined : `${formatPaise(sumPaise(openBookings, 'agreementValuePaise').toString())} agreed`}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle aside={leads.loading || leads.err ? undefined : `${leads.rows.length} leads`}>Lead pipeline</SectionTitle>
          {leads.loading ? (
            <LoadingState variant="rows" rows={1} />
          ) : stageCounts.length === 0 ? (
            <Muted className="text-sm">{leads.err ? 'Lead pipeline unavailable.' : 'No leads captured for this project yet.'}</Muted>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stageCounts.map((s) => (
                <span key={s.stage} className="inline-flex items-center gap-2 rounded-xl bg-surface-low px-3 py-2">
                  <StatusChip value={s.stage} />
                  <span className="numeric text-sm font-semibold">{s.n}</span>
                </span>
              ))}
            </div>
          )}
        </Panel>
        <Panel>
          <SectionTitle>Sales shortcuts</SectionTitle>
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface-low">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{l.label}</span>
                    <Muted>{l.hint}</Muted>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Section
        title="Leads"
        to="/leads"
        list={leads}
        empty="No leads for this project yet."
        columns={[
          {
            key: 'name',
            header: 'Lead',
            cell: (l) => (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{display(l.name)}</p>
                <Mono className="text-muted-foreground">{display(l.phone)}</Mono>
              </div>
            ),
          },
          { key: 'stage', header: 'Stage', cell: (l) => <StatusChip value={l.stage} /> },
          { key: 'source', header: 'Source', cell: (l) => <Muted>{humanize(l.source)}</Muted> },
          { key: 'updated', header: 'Updated', cell: (l) => <Mono className="text-muted-foreground">{formatDate(l.updatedAt ?? l.createdAt)}</Mono> },
        ]}
      />

      <Section
        title="Site visits"
        to="/visits"
        list={visits}
        empty="No site visits scheduled for this project."
        columns={[
          { key: 'when', header: 'When', cell: (v) => <Mono>{formatDateTime(v.scheduledAt)}</Mono> },
          { key: 'lead', header: 'Lead', cell: (v) => <Muted>{v.leadId ? (leadName.get(String(v.leadId)) ?? shortId(v.leadId)) : DASH}</Muted> },
          { key: 'status', header: 'Status', cell: (v) => <StatusChip value={v.status} /> },
          { key: 'notes', header: 'Notes', cell: (v) => <Muted className="line-clamp-1">{display(v.notes)}</Muted> },
        ]}
      />

      <Section
        title="Reservations"
        to="/reservations"
        list={reservations}
        empty="No reservations on this project."
        columns={[
          { key: 'plot', header: 'Plot', cell: (r) => <Mono>{display(r.plot?.number ?? shortId(r.plotId))}</Mono> },
          { key: 'customer', header: 'Customer', cell: (r) => <Muted>{display(r.customer?.name ?? shortId(r.customerId))}</Muted> },
          { key: 'state', header: 'State', cell: (r) => <StatusChip value={r.state} /> },
          { key: 'expires', header: 'Expires', cell: (r) => <Mono className="text-muted-foreground">{formatDateTime(r.expiresAt)}</Mono> },
        ]}
      />

      <Section
        title="Bookings"
        to="/bookings"
        list={bookings}
        empty="No bookings for this project yet."
        linkTo={(b) => `/bookings/${b.id}`}
        columns={[
          { key: 'plot', header: 'Plot', cell: (b) => <Mono>{display(b.plot?.number ?? shortId(b.plotId))}</Mono> },
          { key: 'customer', header: 'Customer', cell: (b) => <span className="text-sm">{display(b.customer?.name ?? shortId(b.customerId))}</span> },
          { key: 'agent', header: 'Agent', cell: (b) => <Muted>{b.agent?.name ?? 'Direct'}</Muted> },
          { key: 'state', header: 'State', cell: (b) => <StatusChip value={b.state} /> },
          { key: 'booked', header: 'Booked', cell: (b) => <Mono className="text-muted-foreground">{formatDate(b.bookedAt ?? b.createdAt)}</Mono> },
          { key: 'value', header: 'Agreement', align: 'right', cell: (b) => <span className="numeric text-sm font-medium">{formatPaise(b.agreementValuePaise)}</span> },
        ]}
      />
    </>
  );
}
