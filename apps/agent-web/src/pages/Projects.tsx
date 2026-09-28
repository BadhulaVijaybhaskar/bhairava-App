import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FolderKanban, LandPlot, MapPinned } from 'lucide-react';
import {
  Chip,
  EmptyState,
  ErrorState,
  FilterBar,
  LinkBtn,
  LoadingState,
  PageHeader,
  Panel,
  PlotStatusChip,
  RecordHeader,
  SectionTitle,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { CustomerPicker, PlotSaleActions, usePlotSale } from '../components/PlotSale';
import { CustomerCell, Notice, RecordList } from '../components/RecordList';
import { useRecord, useRows, type Row } from '../lib/data';
import { formatDate, formatNumber, formatPaise, formatRupees, humanize, text } from '../lib/format';

function matches(query: string, ...values: unknown[]) {
  const q = query.trim().toLowerCase();
  return !q || values.some((v) => String(v ?? '').toLowerCase().includes(q));
}

function plotNumber(plot: Row) {
  return text(plot.number ?? plot.plotNumber);
}

export function ProjectsPage() {
  const projects = useRows(() => api.projects.list());
  const [query, setQuery] = useState('');
  const rows = projects.rows.filter((p) => matches(query, p.name, p.code, p.city, p.state));

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'name',
      header: 'Project',
      cell: (p) => (
        <span className="min-w-0">
          <Link to={`/projects/${p.id}`} className="block truncate font-medium hover:text-primary">{text(p.name)}</Link>
          {p.code ? <span className="block text-xs text-muted-foreground">{p.code}</span> : null}
        </span>
      ),
    },
    { key: 'city', header: 'Location', cell: (p) => [p.city, p.state].filter(Boolean).join(', ') || '—' },
    { key: 'plots', header: 'Plots', align: 'right', cell: (p) => <span className="numeric">{formatNumber(p._count?.plots)}</span> },
    { key: 'status', header: 'Status', cell: (p) => <Chip>{humanize(p.lifecycleStatus)}</Chip> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Projects open to agents. Open one to see live plot availability and reserve or book."
      />
      {projects.rows.length > 0 ? <FilterBar query={query} onQuery={setQuery} placeholder="Search projects…" /> : null}
      <RecordList
        state={{ ...projects, rows }}
        columns={columns}
        linkTo="/projects/:id"
        emptyIcon={FolderKanban}
        emptyTitle={query ? 'No projects match your search' : 'No projects available'}
        emptyDescription={query ? 'Try a different name or city.' : 'Projects appear here once they are visible to agents.'}
      />
    </div>
  );
}

const PLOT_VIEWS = ['All', 'Available', 'Reserved', 'Booked', 'Other'] as const;
type PlotView = (typeof PLOT_VIEWS)[number];

function inView(plot: Row, view: PlotView) {
  const s = String(plot.status);
  if (view === 'All') return true;
  if (view === 'Available') return s === 'AVAILABLE' || s === 'RESALE_AVAILABLE';
  if (view === 'Reserved') return s === 'RESERVED';
  if (view === 'Booked') return s === 'BOOKED';
  return !['AVAILABLE', 'RESALE_AVAILABLE', 'RESERVED', 'BOOKED'].includes(s);
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const project = useRecord(() => api.projects.get(projectId), [projectId]);
  const plots = useRows(() => api.plots.listByProject(projectId), [projectId]);
  const sale = usePlotSale(plots.reload);
  const [view, setView] = useState<PlotView>('All');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c = { total: plots.rows.length, available: 0, held: 0 };
    for (const p of plots.rows) {
      if (inView(p, 'Available')) c.available += 1;
      if (p.status === 'RESERVED' || p.status === 'BOOKED') c.held += 1;
    }
    return c;
  }, [plots.rows]);
  const rows = plots.rows.filter((p) => inView(p, view) && matches(query, p.number, p.plotNumber, p.facing));
  const p = project.record;

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'number',
      header: 'Plot',
      cell: (plot) => (
        <Link to={`/plots/${plot.id}?projectId=${projectId}`} state={{ plot }} className="numeric font-medium hover:text-primary">
          {plotNumber(plot)}
        </Link>
      ),
    },
    { key: 'status', header: 'Status', cell: (plot) => <PlotStatusChip status={plot.status} /> },
    { key: 'area', header: 'Area', align: 'right', cell: (plot) => <span className="numeric">{formatNumber(plot.areaSqYd, ' sq yd')}</span> },
    { key: 'facing', header: 'Facing', cell: (plot) => (plot.facing ? humanize(plot.facing) : '—') },
    { key: 'price', header: 'Price', align: 'right', cell: (plot) => <span className="numeric">{formatRupees(plot.totalPrice)}</span> },
    { key: 'actions', header: 'Actions', align: 'right', cell: (plot) => <PlotSaleActions plot={plot} sale={sale} /> },
  ];

  return (
    <div>
      <RecordHeader
        eyebrow="Project"
        title={p?.name ?? (project.loading ? 'Loading project…' : 'Project')}
        subtitle={[p?.code, p?.city, p?.state].filter(Boolean).join(' · ') || undefined}
        actions={
          <LinkBtn to="/projects" variant="tonal">
            <ArrowLeft className="h-4 w-4" /> All projects
          </LinkBtn>
        }
        facts={[
          { label: 'Status', value: p ? <Chip>{humanize(p.lifecycleStatus)}</Chip> : '—' },
          { label: 'Plots', value: plots.loading ? '—' : formatNumber(counts.total) },
          { label: 'Available', value: plots.loading ? '—' : formatNumber(counts.available) },
          { label: 'Reserved / booked', value: plots.loading ? '—' : formatNumber(counts.held) },
        ]}
      />
      {project.err ? (
        <div className="mt-4">
          <Notice tone="error">{project.err}</Notice>
        </div>
      ) : null}

      <div className="mt-4">
        <CustomerPicker sale={sale} />
      </div>

      <div className="mt-6">
        <SectionTitle aside={plots.loading ? undefined : `${rows.length} of ${counts.total}`}>Plot availability</SectionTitle>
        {plots.rows.length > 0 ? (
          <FilterBar
            views={[...PLOT_VIEWS]}
            active={view}
            onSelect={(v) => setView(v as PlotView)}
            query={query}
            onQuery={setQuery}
            placeholder="Search plot number…"
          />
        ) : null}
        <RecordList
          state={{ ...plots, rows }}
          columns={columns}
          linkTo={(plot) => `/plots/${plot.id}?projectId=${projectId}`}
          emptyIcon={LandPlot}
          emptyTitle={plots.rows.length ? 'No plots in this view' : 'No plots published yet'}
          emptyDescription={plots.rows.length ? 'Switch the status filter or clear the search.' : 'Plots appear once the project inventory is set up.'}
          errorTitle="Could not load plots"
          testId="project-plots"
        />
      </div>
    </div>
  );
}

export function PlotDetailPage() {
  const { plotId = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const statePlot = (location.state as { plot?: Row } | null)?.plot;
  const projectId = params.get('projectId') ?? (statePlot?.projectId as string | undefined) ?? '';

  const project = useRecord(projectId ? () => api.projects.get(projectId) : null, [projectId]);
  const plots = useRows(() => (projectId ? api.plots.listByProject(projectId) : Promise.resolve([])), [projectId]);
  const reservations = useRows(() => (projectId ? api.reservations.list({ projectId }) : Promise.resolve([])), [projectId]);
  const bookings = useRows(() => (projectId ? api.bookings.list({ projectId }) : Promise.resolve([])), [projectId]);
  const sale = usePlotSale(() => {
    plots.reload();
    reservations.reload();
    bookings.reload();
  });

  const livePlot = plots.rows.find((row) => row.id === plotId);
  const plot = livePlot ?? (statePlot?.id === plotId ? statePlot : undefined);
  const plotReservations = reservations.rows.filter((r) => r.plotId === plotId);
  const plotBookings = bookings.rows.filter((b) => b.plotId === plotId);

  if (!projectId && !plot) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={MapPinned}
          title="Open this plot from its project"
          description="Plot details load from the project inventory, so start from the project page."
          action={<LinkBtn to="/projects" variant="primary">Browse projects</LinkBtn>}
        />
      </div>
    );
  }
  if (!plot && plots.loading) return <LoadingState label="Loading plot…" />;
  if (!plot && plots.err) return <ErrorState title="Could not load plot" error={plots.err} onRetry={plots.reload} />;
  if (!plot) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={MapPinned}
          title="Plot not found"
          description="It may have been removed from the project or is not visible to your account."
          action={<LinkBtn to={`/projects/${projectId}`} variant="tonal">Back to project</LinkBtn>}
        />
      </div>
    );
  }

  const area = Number(plot.areaSqYd);
  const price = Number(plot.totalPrice);
  const rate = area > 0 && price > 0 ? price / area : null;
  const reservable = plot.status === 'AVAILABLE' || plot.status === 'RESERVED';

  return (
    <div>
      <RecordHeader
        eyebrow={project.record?.name ? `${project.record.name} · Plot` : 'Plot'}
        title={`Plot ${plotNumber(plot)}`}
        subtitle={<PlotStatusChip status={plot.status} />}
        actions={
          projectId ? (
            <LinkBtn to={`/projects/${projectId}`} variant="tonal">
              <ArrowLeft className="h-4 w-4" /> Project inventory
            </LinkBtn>
          ) : null
        }
        facts={[
          { label: 'Area', value: formatNumber(plot.areaSqYd, ' sq yd') },
          { label: 'Facing', value: plot.facing ? humanize(plot.facing) : '—' },
          { label: 'Total price', value: formatRupees(plot.totalPrice) },
          { label: 'Rate / sq yd', value: rate ? formatRupees(Math.round(rate)) : '—' },
        ]}
      />
      {!livePlot && !plots.loading ? (
        <div className="mt-4">
          <Notice tone="error">Live status unavailable; showing the details from the project page.</Notice>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <CustomerPicker sale={sale} />
        <Panel>
          <SectionTitle>Reserve or book</SectionTitle>
          <p className="pb-4 text-sm text-muted-foreground">
            {reservable
              ? 'This plot can be reserved or booked for the selected customer.'
              : `This plot is ${humanize(plot.status).toLowerCase()}. Reservations are closed; booking is validated by the server.`}
          </p>
          <PlotSaleActions plot={plot} sale={sale} />
          <p className="pt-4 text-xs text-muted-foreground">Layout: {plot.polygonJson ? 'mapped on the site plan' : 'not mapped yet'}</p>
        </Panel>
      </div>

      <Panel className="mt-4">
        <SectionTitle aside="Scoped to your records">Your activity on this plot</SectionTitle>
        {reservations.loading || bookings.loading ? (
          <LoadingState variant="rows" rows={2} className="p-0 shadow-none" />
        ) : plotReservations.length === 0 && plotBookings.length === 0 ? (
          <EmptyState compact icon={LandPlot} title="No reservations or bookings by you" />
        ) : (
          <ul className="space-y-1">
            {plotReservations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-low">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Reservation</p>
                  <p className="text-xs text-muted-foreground">Expires {formatDate(r.expiresAt)}</p>
                </div>
                <CustomerCell customer={r.customer} fallbackId={r.customerId} />
                <Chip>{humanize(r.state)}</Chip>
              </li>
            ))}
            {plotBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-low">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Booking</p>
                  <p className="numeric text-xs text-muted-foreground">{formatPaise(b.agreementValuePaise)} · {formatDate(b.bookedAt ?? b.createdAt)}</p>
                </div>
                <CustomerCell customer={b.customer} fallbackId={b.customerId} />
                <Chip>{humanize(b.state)}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
