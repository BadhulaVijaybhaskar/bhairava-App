import { ArrowLeft, ArrowRight, FolderKanban, LifeBuoy, MapPin, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Chip,
  DataTable,
  EmptyState,
  FilterBar,
  LinkBtn,
  Metric,
  PageHeader,
  Panel,
  PlotStatusChip,
  RecordHeader,
  SectionTitle,
  plotStatusLabel,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection } from '../components';
import { formatArea, humanize } from '../lib/format';
import { projectStatusLabel, projectTone } from '../lib/status';
import type { CustomerPlot, CustomerProject } from '../lib/types';
import { useApi } from '../lib/use-api';

function projectPlace(p: CustomerProject) {
  return [p.location, p.city, p.state].filter(Boolean).join(', ');
}

export function ExplorePage() {
  const state = useApi(() => api.projects.list() as Promise<CustomerProject[]>);
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Discover"
        title="Explore projects"
        description="Open Bhairava layouts you can browse today. Pick a project to see which plots are still available."
      />
      <AsyncSection state={state}>
        {(projects) => {
          const q = query.trim().toLowerCase();
          const visible = q
            ? projects.filter((p) => [p.name, p.city, p.location, p.code].some((v) => v?.toLowerCase().includes(q)))
            : projects;
          if (projects.length === 0) {
            return (
              <EmptyState
                icon={FolderKanban}
                title="No projects listed yet"
                description="New layouts will appear here as soon as they open to customers."
              />
            );
          }
          return (
            <>
              <FilterBar query={query} onQuery={setQuery} placeholder="Search by name or city…" />
              {visible.length === 0 ? (
                <EmptyState compact icon={SearchX} title="No matching projects" description="Try a different name or city." />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {visible.map((p) => (
                    <Link key={p.id} to={`/explore/${p.id}`} className="group block">
                      <Panel tonal className="lift flex h-full flex-col gap-4 sm:p-7">
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-lowest text-primary shadow-ambient">
                            <FolderKanban className="h-5 w-5" strokeWidth={1.9} />
                          </span>
                          <Chip tone={projectTone(p.lifecycleStatus)}>{projectStatusLabel(p.lifecycleStatus)}</Chip>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-lg font-semibold tracking-tight">{p.name}</p>
                          {projectPlace(p) ? (
                            <p className="flex items-center gap-1.5 pt-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{projectPlace(p)}</span>
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                          <span className="numeric text-muted-foreground">
                            {p._count?.plots != null ? `${p._count.plots} plots` : p.code}
                          </span>
                          <span className="inline-flex items-center gap-1 font-medium text-primary">
                            View plots
                            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Panel>
                    </Link>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </AsyncSection>
    </div>
  );
}

const ALL = 'All plots';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const project = useApi(() => api.projects.get(projectId) as Promise<CustomerProject>, [projectId]);
  const plots = useApi(() => api.plots.listByProject(projectId) as Promise<CustomerPlot[]>, [projectId]);
  const [view, setView] = useState(ALL);
  const [query, setQuery] = useState('');

  const plotRows = plots.data ?? [];
  const views = useMemo(() => {
    const labels = Array.from(new Set(plotRows.map((p) => plotStatusLabel(p.status))));
    return [ALL, ...labels];
  }, [plotRows]);
  const availableCount = plotRows.filter((p) => plotStatusLabel(p.status) === plotStatusLabel('AVAILABLE')).length;

  const visible = plotRows.filter((p) => {
    if (view !== ALL && plotStatusLabel(p.status) !== view) return false;
    const q = query.trim().toLowerCase();
    return !q || p.number.toLowerCase().includes(q) || (p.facing ?? '').toLowerCase().includes(q);
  });

  const columns: DataTableColumn<CustomerPlot>[] = [
    { key: 'number', header: 'Plot', cell: (p) => <span className="numeric font-medium">Plot {p.number}</span> },
    { key: 'status', header: 'Availability', cell: (p) => <PlotStatusChip status={p.status} /> },
    { key: 'area', header: 'Area', cell: (p) => <span className="numeric">{formatArea(p.areaSqYd)}</span> },
    { key: 'facing', header: 'Facing', cell: (p) => (p.facing ? humanize(p.facing) : '—') },
  ];

  const p = project.data;

  return (
    <div className="space-y-2">
      <div className="pt-4">
        <LinkBtn to="/explore" className="-ml-3">
          <ArrowLeft className="h-4 w-4" /> All projects
        </LinkBtn>
      </div>
      <PageHeader
        className="pt-1 sm:pt-3"
        eyebrow="Plot availability"
        title={p?.name ?? (project.error ? 'Project' : 'Loading project…')}
        description={p ? p.description || projectPlace(p) || undefined : undefined}
        actions={p ? <Chip tone={projectTone(p.lifecycleStatus)}>{projectStatusLabel(p.lifecycleStatus)}</Chip> : undefined}
      />

      <AsyncSection state={plots} errorTitle="We couldn’t load plots for this project">
        {() => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              <Metric label="Total plots" value={plotRows.length} />
              <Metric accent label="Available now" value={availableCount} hint={availableCount ? 'Ready to explore' : 'Check back soon'} />
              <Metric className="hidden lg:block" label="Location" size="sm" value={p ? p.city || '—' : '—'} />
            </div>

            <section>
              <SectionTitle aside={`${visible.length} of ${plotRows.length}`}>Plots</SectionTitle>
              <FilterBar
                views={views.length > 2 ? views : undefined}
                active={view}
                onSelect={setView}
                query={query}
                onQuery={setQuery}
                placeholder="Search plot number…"
              />
              <DataTable
                rows={visible}
                columns={columns}
                linkTo="/explore/:projectId/plots/:id"
                params={() => ({ projectId })}
                emptyMessage={plotRows.length ? 'No plots match this filter.' : 'Plots for this project will be published soon.'}
              />
            </section>
          </div>
        )}
      </AsyncSection>
    </div>
  );
}

export function PlotDetailPage() {
  const { projectId = '', plotId = '' } = useParams();
  const project = useApi(() => api.projects.get(projectId) as Promise<CustomerProject>, [projectId]);
  const plots = useApi(() => api.plots.listByProject(projectId) as Promise<CustomerPlot[]>, [projectId]);

  return (
    <div className="space-y-6">
      <div className="pt-4">
        <LinkBtn to={`/explore/${projectId}`} className="-ml-3">
          <ArrowLeft className="h-4 w-4" /> {project.data?.name ?? 'Back to project'}
        </LinkBtn>
      </div>
      <AsyncSection state={plots} loading="spinner" errorTitle="We couldn’t load this plot">
        {(rows) => {
          const plot = rows.find((r) => r.id === plotId);
          if (!plot) {
            return (
              <EmptyState
                icon={SearchX}
                title="Plot not found"
                description="This plot may have been renumbered or is no longer listed."
                action={<LinkBtn to={`/explore/${projectId}`} variant="tonal">See all plots</LinkBtn>}
              />
            );
          }
          const place = project.data ? projectPlace(project.data) : '';
          return (
            <>
              <RecordHeader
                className="mt-0 sm:mt-0"
                eyebrow={project.data?.name ?? 'Plot'}
                title={`Plot ${plot.number}`}
                subtitle={place || undefined}
                actions={<PlotStatusChip status={plot.status} className="text-xs" />}
                facts={[
                  { label: 'Availability', value: plotStatusLabel(plot.status) },
                  { label: 'Area', value: formatArea(plot.areaSqYd) },
                  { label: 'Facing', value: plot.facing ? humanize(plot.facing) : '—' },
                  { label: 'Project', value: project.data?.name ?? '—' },
                ]}
              />
              <Panel tonal className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-lowest text-primary shadow-ambient">
                    <LifeBuoy className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold tracking-tight">Interested in this plot?</p>
                    <p className="max-w-prose pt-1 text-sm leading-relaxed text-muted-foreground">
                      Your relationship manager can walk you through pricing, site visits and next steps.
                    </p>
                  </div>
                </div>
                <LinkBtn to="/support" variant="primary" className="shrink-0">
                  Contact us
                </LinkBtn>
              </Panel>
            </>
          );
        }}
      </AsyncSection>
    </div>
  );
}
