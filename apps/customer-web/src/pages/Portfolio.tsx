import { ArrowRight, Map as MapIcon, Receipt, UserRound } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chip,
  DataTable,
  EmptyState,
  LinkBtn,
  PageHeader,
  Panel,
  PlotStatusChip,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection, FactGrid } from '../components';
import { formatDate, formatPaise, humanize, shortId } from '../lib/format';
import { bookingTone } from '../lib/status';
import type { CustomerBooking, CustomerProject } from '../lib/types';
import { useApi } from '../lib/use-api';

/** Project names for bookings; only customer-listed projects resolve. */
function useProjectNames() {
  const projects = useApi(() => api.projects.list() as Promise<CustomerProject[]>);
  return useMemo(() => {
    const byId = new Map<string, CustomerProject>();
    for (const p of projects.data ?? []) byId.set(p.id, p);
    return byId;
  }, [projects.data]);
}

export function PropertiesPage() {
  const state = useApi(() => api.bookings.list() as Promise<CustomerBooking[]>);
  const projects = useProjectNames();

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="My portfolio"
        title="My properties"
        description="Every plot you own or have booked with Bhairava, with its current status."
      />
      <AsyncSection state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="No properties yet"
              description="Once a booking is confirmed in your name, your plot will show up here."
              action={<LinkBtn to="/explore" variant="primary">Explore projects</LinkBtn>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {rows.map((b) => {
                const project = b.projectId ? projects.get(b.projectId) : undefined;
                const plotHref = project && b.plotId ? `/explore/${project.id}/plots/${b.plotId}` : null;
                return (
                  <Panel key={b.id} className="flex flex-col gap-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                          {project?.name ?? 'Bhairava project'}
                        </p>
                        <p className="numeric pt-1.5 font-display text-2xl font-semibold tracking-tight">
                          Plot {b.plot?.number ?? shortId(b.plotId)}
                        </p>
                      </div>
                      {b.plot?.status ? <PlotStatusChip status={b.plot.status} /> : null}
                    </div>
                    <FactGrid
                      facts={[
                        { label: 'Agreement value', value: formatPaise(b.agreementValuePaise) },
                        { label: 'Booked on', value: formatDate(b.bookedAt) },
                        { label: 'Booking status', value: <Chip tone={bookingTone(b.state)}>{humanize(b.state)}</Chip> },
                        {
                          label: 'Relationship manager',
                          value: b.responsibleAgent ? (
                            <span className="inline-flex items-center gap-1.5 font-sans">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                              {b.responsibleAgent.name}
                            </span>
                          ) : (
                            '—'
                          ),
                        },
                      ]}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      <LinkBtn to="/schedules" variant="tonal">Payment schedule</LinkBtn>
                      {plotHref ? (
                        <LinkBtn to={plotHref}>
                          View plot <ArrowRight className="h-4 w-4" />
                        </LinkBtn>
                      ) : null}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )
        }
      </AsyncSection>
    </div>
  );
}

export function BookingsPage() {
  const state = useApi(() => api.bookings.list() as Promise<CustomerBooking[]>);
  const projects = useProjectNames();

  const columns: DataTableColumn<CustomerBooking>[] = [
    {
      key: 'plot',
      header: 'Plot',
      cell: (b) => <span className="numeric font-medium">Plot {b.plot?.number ?? shortId(b.plotId)}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      cell: (b) => (b.projectId ? projects.get(b.projectId)?.name ?? '—' : '—'),
    },
    { key: 'bookedAt', header: 'Booked on', cell: (b) => <span className="numeric">{formatDate(b.bookedAt)}</span> },
    {
      key: 'value',
      header: 'Agreement value',
      align: 'right',
      cell: (b) => <span className="numeric">{formatPaise(b.agreementValuePaise)}</span>,
    },
    { key: 'state', header: 'Status', cell: (b) => <Chip tone={bookingTone(b.state)}>{humanize(b.state)}</Chip> },
    { key: 'ref', header: 'Reference', cell: (b) => <span className="numeric text-muted-foreground">{shortId(b.id)}</span> },
  ];

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="My portfolio"
        title="My bookings"
        description="Your booking records, agreement values and where each one stands."
        actions={<LinkBtn to="/receipts" variant="tonal"><Receipt className="h-4 w-4" /> Receipts</LinkBtn>}
      />
      <AsyncSection state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No bookings yet"
              description="Bookings made in your name will be listed here."
              action={<LinkBtn to="/explore" variant="primary">Explore projects</LinkBtn>}
            />
          ) : (
            <DataTable rows={rows} columns={columns} />
          )
        }
      </AsyncSection>
      <p className="pt-4 text-center text-xs text-muted-foreground">
        Need to change something about a booking? <Link to="/support" className="font-medium text-primary">Contact support</Link>.
      </p>
    </div>
  );
}
