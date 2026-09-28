import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  Grid3x3,
  Image as ImageIcon,
  IndianRupee,
  Layers,
  LayoutDashboard,
  Map as MapIcon,
  Plus,
  Ruler,
  Save,
  Settings2,
  Trash2,
  TrendingUp,
  Trees,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Btn,
  Chip,
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
  SwitchControl,
  Tabs,
  plotStatusColors,
  toneFor,
  type TabItem,
} from '@bhairava/ui-web';
import { isMappedPolygon, toCanonicalPlotStatus } from '@bhairava/domain';
import { api } from '../api';
import {
  Fact,
  FormActions,
  FormGrid,
  Mono,
  Muted,
  NativeInput,
  NativeSelect,
  NativeTextarea,
  Notice,
  StatusChip,
} from '../components/common';
import { DASH, display, errMsg, formatDate, formatRupees, humanize, useAsyncList, withIds, type AnyRow } from '../lib/data';
import { DocumentsPage } from './Documents';
import { PlotCanvas, type CanvasPlot } from '../PlotCanvas';
import { ComingSoonPanel } from './project-workspace/ComingSoonPanel';
import { FinanceTab } from './project-workspace/FinanceTab';
import { SalesTab } from './project-workspace/SalesTab';

type Row = AnyRow & { id: string | number };

const LIFECYCLES = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;

const TAB_KEYS = [
  'overview',
  'setup',
  'phases',
  'blocks',
  'plot-types',
  'pricing',
  'amenities',
  'media',
  'visibility',
  'layout',
  'sales',
  'finance',
  'documents',
  'team',
  'activity',
] as const;
type TabKey = (typeof TAB_KEYS)[number];

function parseTab(raw: string | null): TabKey {
  return (TAB_KEYS as readonly string[]).includes(raw ?? '') ? (raw as TabKey) : 'overview';
}

function lifecycleTone(v: unknown) {
  const s = String(v || '').toUpperCase();
  if (s === 'ACTIVE') return 'positive' as const;
  if (s === 'DRAFT' || s === 'ON_HOLD') return 'warning' as const;
  if (s === 'ARCHIVED') return 'neutral' as const;
  if (s === 'COMPLETED') return 'info' as const;
  return toneFor(humanize(v));
}

function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Btn className="min-h-9 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onClick} aria-label={label}>
      <Trash2 className="h-3.5 w-3.5" /> Remove
    </Btn>
  );
}

function SubmitBtn({ children, icon: Icon = Save }: { children: ReactNode; icon?: typeof Save }) {
  return (
    <Btn type="submit" variant="primary">
      <Icon className="h-4 w-4" /> {children}
    </Btn>
  );
}

export function ProjectWorkspacePage() {
  const { projectId } = useParams();
  const [search, setSearch] = useSearchParams();
  const tab = parseTab(search.get('tab'));
  const [bundle, setBundle] = useState<AnyRow | null>(null);
  const [version, setVersion] = useState(0);
  const [loadErr, setLoadErr] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const plots = useAsyncList(
    () => (projectId ? (api.plots.listByProject(projectId) as Promise<AnyRow[]>) : Promise.resolve([])),
    [projectId],
  );
  const bookings = useAsyncList(
    () => (projectId ? (api.bookings.list({ projectId }) as Promise<AnyRow[]>) : Promise.resolve([])),
    [projectId],
  );

  const [layoutImageUrl, setLayoutImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!projectId) { setLayoutImageUrl(null); return; }
    api.layouts
      .list(projectId)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const first = list[0] as AnyRow | undefined;
        const meta = first?.metaJson as AnyRow | undefined;
        setLayoutImageUrl(
          (first?.downloadUrl as string) ||
            (meta?.publicUrl as string) ||
            (meta?.url as string) ||
            null,
        );
      })
      .catch(() => setLayoutImageUrl(null));
  }, [projectId, version]);

  const reload = useCallback(() => {
    if (!projectId) return;
    api.projects
      .setup(projectId)
      .then((b) => {
        setBundle(b as AnyRow);
        setVersion((v) => v + 1);
      })
      .catch((e) => setLoadErr(errMsg(e)));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const project = bundle?.project as AnyRow | undefined;
  const phases = (bundle?.phases as AnyRow[]) || [];
  const blocks = (bundle?.blocks as AnyRow[]) || [];
  const plotTypes = (bundle?.plotTypes as AnyRow[]) || [];
  const amenities = (bundle?.amenities as AnyRow[]) || [];
  const layouts = (bundle?.layouts as AnyRow[]) || [];
  const pricing = bundle?.pricingRules as AnyRow | null | undefined;
  const gallery: AnyRow[] = Array.isArray((project?.settingsJson as AnyRow)?.gallery) ? ((project?.settingsJson as AnyRow).gallery as AnyRow[]) : [];

  const [visibility, setVisibility] = useState({ agentVisible: false, customerListed: false, resaleAvailable: false, lifecycleStatus: 'DRAFT' });
  useEffect(() => {
    if (!project) return;
    setVisibility({
      agentVisible: !!project.agentVisible,
      customerListed: !!project.customerListed,
      resaleAvailable: !!project.resaleAvailable,
      lifecycleStatus: project.lifecycleStatus || 'DRAFT',
    });
  }, [project]);

  function setTab(next: TabKey) {
    setMsg(''); setErr('');
    const params = new URLSearchParams(search);
    if (next === 'overview') params.delete('tab');
    else params.set('tab', next);
    setSearch(params, { replace: true });
  }

  function done(text: string, form?: HTMLFormElement) {
    form?.reset();
    setMsg(text);
    reload();
  }

  async function saveSetup(e: FormEvent) {
    e.preventDefault();
    if (!projectId || !project) return;
    setMsg(''); setErr('');
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api.projects.update(projectId, {
        name: fd.get('name'),
        city: fd.get('city'),
        state: fd.get('state'),
        location: fd.get('location'),
        address: fd.get('address'),
        description: fd.get('description'),
        reraNumber: fd.get('reraNumber'),
        projectType: fd.get('projectType'),
        pincode: fd.get('pincode'),
        lifecycleStatus: fd.get('lifecycleStatus'),
      });
      done('Setup saved (DRAFT workspace — no forced full config on create)');
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function saveVisibility(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    try {
      await api.projects.update(projectId, {
        agentVisible: visibility.agentVisible,
        customerListed: visibility.customerListed,
        resaleAvailable: visibility.resaleAvailable,
        lifecycleStatus: visibility.lifecycleStatus,
      });
      done('Visibility / publishing saved');
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function addPlotType(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await api.projects.addPlotType(projectId, {
        name: fd.get('name'),
        code: fd.get('code') || undefined,
        areaSqYd: String(fd.get('areaSqYd') || '0'),
        category: fd.get('category') || undefined,
      });
      done('Plot type added', form);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function savePricing(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const fd = new FormData(e.target as HTMLFormElement);
    try {
      await api.projects.upsertPricing(projectId, {
        baseRatePerSqYd: String(fd.get('baseRatePerSqYd') || '0'),
        rulesJson: { facingPremiumPct: Number(fd.get('facingPremiumPct') || 0), cornerPremiumPct: Number(fd.get('cornerPremiumPct') || 0) },
      });
      done('Pricing saved');
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function addAmenity(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await api.projects.addAmenity(projectId, {
        name: fd.get('name'),
        groupName: fd.get('groupName') || undefined,
        description: fd.get('description') || undefined,
        status: fd.get('status') || 'PLANNED',
      });
      done('Amenity added', form);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function addPhase(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await api.projects.addPhase(projectId, {
        name: fd.get('name'),
        status: fd.get('status') || 'Planned',
        startDate: fd.get('startDate') || undefined,
        endDate: fd.get('endDate') || undefined,
      });
      done('Phase added', form);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    try {
      await api.projects.addBlock(projectId, {
        name: fd.get('name'),
        phaseId: fd.get('phaseId') || undefined,
      });
      done('Block added', form);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function uploadMedia(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setMsg(''); setErr('');
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    try {
      const kind = String(fd.get('kind') || 'gallery');
      const meta = (await api.projects.mediaUpload(projectId, {
        kind,
        originalName: file?.name || 'upload.bin',
        mimeType: file?.type || 'application/octet-stream',
        sizeBytes: file?.size || 0,
        label: fd.get('label') || undefined,
      })) as AnyRow;
      const url = meta?.upload?.uploadUrl;
      if (url && file) {
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      }
      done('Media uploaded via presigned URL (' + kind + ')', form);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  async function remove(action: () => Promise<unknown>, label: string) {
    setMsg(''); setErr('');
    try {
      await action();
      done(`${label} removed`);
    } catch (ex) { setErr(errMsg(ex)); }
  }

  const inventory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of plots.rows) {
      const s = toCanonicalPlotStatus(p.status);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const c = (s: string) => counts.get(s) ?? 0;
    const mapped = plots.rows.filter((p) => isMappedPolygon(p.polygonJson)).length;
    return { counts, c, total: plots.rows.length, mapped };
  }, [plots.rows]);

  const readiness = useMemo(() => {
    const items: { key: string; label: string; ok: boolean; tab: TabKey }[] = [
      { key: 'basic', label: 'Basic information', ok: !!(project?.name && project?.city), tab: 'setup' },
      { key: 'location', label: 'Location & address', ok: !!(project?.location || project?.address), tab: 'setup' },
      { key: 'phases', label: 'At least one phase', ok: phases.length > 0, tab: 'phases' },
      { key: 'plot-types', label: 'Plot types defined', ok: plotTypes.length > 0, tab: 'plot-types' },
      { key: 'pricing', label: 'Pricing rules', ok: !!pricing, tab: 'pricing' },
      { key: 'amenities', label: 'Amenities listed', ok: amenities.length > 0, tab: 'amenities' },
      { key: 'media', label: 'Cover or gallery media', ok: !!(project?.coverImageKey || gallery.length), tab: 'media' },
      { key: 'layout', label: 'Master plan layout', ok: layouts.length > 0, tab: 'layout' },
      { key: 'publish', label: 'Published to agents or customers', ok: !!(project?.agentVisible || project?.customerListed), tab: 'visibility' },
    ];
    const complete = items.filter((i) => i.ok).length;
    return { items, percent: Math.round((complete / items.length) * 100) };
  }, [project, phases.length, plotTypes.length, pricing, amenities.length, gallery.length, layouts.length]);

  const tabs: TabItem<TabKey>[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'setup', label: 'Setup & location', icon: Settings2 },
    { key: 'phases', label: 'Phases', icon: Layers, count: phases.length },
    { key: 'blocks', label: 'Blocks', icon: Boxes, count: blocks.length },
    { key: 'plot-types', label: 'Plot types', icon: Ruler, count: plotTypes.length },
    { key: 'pricing', label: 'Pricing', icon: IndianRupee },
    { key: 'amenities', label: 'Amenities', icon: Trees, count: amenities.length },
    { key: 'media', label: 'Media', icon: ImageIcon },
    { key: 'visibility', label: 'Visibility', icon: Eye },
    { key: 'layout', label: 'Layout & plots', icon: MapIcon, count: layouts.length },
    { key: 'sales', label: 'Sales', icon: TrendingUp, ...(bookings.loading || bookings.err ? {} : { count: bookings.rows.length }) },
    { key: 'finance', label: 'Finance', icon: Wallet },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'team', label: 'Team', icon: Users },
    { key: 'activity', label: 'Activity', icon: Activity },
  ];

  if (loadErr) {
    return (
      <ErrorState
        className="mt-6"
        title="Project not available"
        error={loadErr}
        action={<LinkBtn to="/projects" variant="tonal"><ArrowLeft className="h-4 w-4" /> Back to projects</LinkBtn>}
      />
    );
  }
  if (!bundle || !project) return <LoadingState label="Loading project workspace…" />;

  const layoutHref = `/layouts?projectId=${projectId}`;

  return (
    <>
      <RecordHeader
        eyebrow={project.code || 'Project'}
        title={project.name || 'Project workspace'}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>{[project.location, project.city, project.state].filter(Boolean).join(', ') || 'Location pending'}</span>
            <Chip tone={lifecycleTone(project.lifecycleStatus)}>{humanize(project.lifecycleStatus)}</Chip>
            <Chip tone={project.agentVisible ? 'positive' : 'neutral'}>{project.agentVisible ? 'Agent visible' : 'Agent hidden'}</Chip>
            <Chip tone={project.customerListed ? 'positive' : 'neutral'}>{project.customerListed ? 'Customer listed' : 'Not listed'}</Chip>
            {project.resaleAvailable ? <Chip tone="info">Resale open</Chip> : null}
            <Chip tone={readiness.percent === 100 ? 'positive' : 'warning'}>{`Readiness ${readiness.percent}%`}</Chip>
          </div>
        }
        facts={[
          { label: 'Total plots', value: plots.loading ? DASH : inventory.total },
          { label: 'Available', value: plots.loading ? DASH : inventory.c('AVAILABLE') },
          { label: 'Reserved / Booked', value: plots.loading ? DASH : `${inventory.c('RESERVED')} / ${inventory.c('BOOKED')}` },
          { label: 'Layouts', value: layouts.length },
        ]}
        actions={
          <>
            <LinkBtn to="/projects" variant="ghost">
              <ArrowLeft className="h-4 w-4" /> Projects
            </LinkBtn>
            <LinkBtn to={`/projects/${projectId}/plots`} variant="tonal">
              <Grid3x3 className="h-4 w-4" /> Plots
            </LinkBtn>
            <LinkBtn to={layoutHref} variant="primary">
              Open live layout <ArrowUpRight className="h-4 w-4" />
            </LinkBtn>
          </>
        }
      />

      <Tabs items={tabs} value={tab} onChange={setTab} aria-label="Project workspace sections" className="mt-6" />

      <div className="space-y-2 pt-4 empty:hidden">
        <Notice tone="err">{err}</Notice>
        <Notice tone="ok">{msg}</Notice>
      </div>

      <div className="rise space-y-4 pt-4" key={tab}>
        {tab === 'overview' && (
          <>
            {plots.loading ? (
              <LoadingState variant="metrics" rows={4} />
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric accent label="Total plots" value={inventory.total} hint={`${inventory.mapped} mapped on layout`} />
                <Metric label="Available" value={inventory.c('AVAILABLE') + inventory.c('RESALE_AVAILABLE')} hint="Incl. resale" />
                <Metric label="Reserved / Booked" value={`${inventory.c('RESERVED')} / ${inventory.c('BOOKED')}`} />
                <Metric label="Sold / Registered" value={`${inventory.c('SOLD')} / ${inventory.c('REGISTERED')}`} />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              <Panel className="lg:col-span-2">
                <SectionTitle aside={`${readiness.percent}% complete`}>Setup checklist</SectionTitle>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-surface-c">
                  <div className="gradient-primary h-full rounded-full transition-[width] duration-500" style={{ width: `${readiness.percent}%` }} />
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {readiness.items.map((i) => (
                    <li key={i.key}>
                      <button
                        type="button"
                        onClick={() => setTab(i.tab)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-low"
                      >
                        {i.ok ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={i.ok ? '' : 'text-muted-foreground'}>{i.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel>
                <SectionTitle>Project details</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Fact label="Type">{display(project.projectType)}</Fact>
                  <Fact label="RERA">{display(project.reraNumber)}</Fact>
                  <Fact label="Pincode">{display(project.pincode)}</Fact>
                  <Fact label="Base rate">{pricing ? `${formatRupees(pricing.baseRatePerSqYd)}/sq yd` : DASH}</Fact>
                </div>
                {project.description ? <p className="pt-4 text-sm leading-relaxed text-muted-foreground">{project.description}</p> : null}
              </Panel>
            </div>
          </>
        )}

        {tab === 'setup' && (
          <form key={version} onSubmit={saveSetup} className="space-y-4">
            <Panel>
              <SectionTitle aside="Saved to PATCH /api/projects/:id">Basic information</SectionTitle>
              <FormGrid>
                <Field label="Name" required><NativeInput name="name" required defaultValue={project.name || ''} /></Field>
                <Field label="Type"><NativeInput name="projectType" defaultValue={project.projectType || 'Plotted development'} /></Field>
                <Field label="RERA number"><NativeInput name="reraNumber" defaultValue={project.reraNumber || ''} /></Field>
                <Field label="Lifecycle">
                  <NativeSelect name="lifecycleStatus" defaultValue={project.lifecycleStatus || 'DRAFT'}>
                    {LIFECYCLES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Description" className="sm:col-span-2 lg:col-span-3">
                  <NativeTextarea name="description" rows={3} defaultValue={project.description || ''} />
                </Field>
              </FormGrid>
            </Panel>
            <Panel>
              <SectionTitle>Location</SectionTitle>
              <FormGrid>
                <Field label="Location / locality"><NativeInput name="location" defaultValue={project.location || ''} /></Field>
                <Field label="City"><NativeInput name="city" defaultValue={project.city || ''} /></Field>
                <Field label="State"><NativeInput name="state" defaultValue={project.state || ''} /></Field>
                <Field label="Pincode"><NativeInput name="pincode" inputMode="numeric" defaultValue={project.pincode || ''} /></Field>
                <Field label="Address" className="sm:col-span-2"><NativeInput name="address" defaultValue={project.address || ''} /></Field>
              </FormGrid>
              <FormActions>
                <SubmitBtn>Save setup</SubmitBtn>
              </FormActions>
            </Panel>
          </form>
        )}

        {tab === 'phases' && (
          <>
            <Panel>
              <SectionTitle>Add phase</SectionTitle>
              <form onSubmit={addPhase}>
                <FormGrid className="lg:grid-cols-4">
                  <Field label="Name" required><NativeInput name="name" required placeholder="Phase 1" /></Field>
                  <Field label="Status">
                    <NativeSelect name="status" defaultValue="Planned">
                      <option>Planned</option><option>Active</option><option>Completed</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Start"><NativeInput type="date" name="startDate" /></Field>
                  <Field label="End"><NativeInput type="date" name="endDate" /></Field>
                </FormGrid>
                <FormActions><SubmitBtn icon={Plus}>Add phase</SubmitBtn></FormActions>
              </form>
            </Panel>
            <DataTable<Row>
              rows={withIds(phases)}
              emptyMessage="No phases yet."
              columns={[
                { key: 'name', header: 'Phase', cell: (ph) => <span className="text-sm font-medium">{display(ph.name)}</span> },
                { key: 'status', header: 'Status', cell: (ph) => <StatusChip value={ph.status} /> },
                { key: 'order', header: 'Order', align: 'right', cell: (ph) => <Mono>{display(ph.sortOrder)}</Mono> },
                { key: 'start', header: 'Start', cell: (ph) => <Mono>{formatDate(ph.startDate)}</Mono> },
                { key: 'end', header: 'End', cell: (ph) => <Mono>{formatDate(ph.endDate)}</Mono> },
                { key: 'rm', header: '', align: 'right', cell: (ph) => <RemoveBtn label={`Remove ${ph.name}`} onClick={() => void remove(() => api.projects.removePhase(projectId!, String(ph.id)), 'Phase')} /> },
              ]}
            />
          </>
        )}

        {tab === 'blocks' && (
          <>
            <Panel>
              <SectionTitle>Add block</SectionTitle>
              <form onSubmit={addBlock}>
                <FormGrid className="lg:grid-cols-2">
                  <Field label="Name" required><NativeInput name="name" required placeholder="Block A" /></Field>
                  <Field label="Phase">
                    <NativeSelect name="phaseId" defaultValue="">
                      <option value="">{DASH} none {DASH}</option>
                      {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                    </NativeSelect>
                  </Field>
                </FormGrid>
                <FormActions><SubmitBtn icon={Plus}>Add block</SubmitBtn></FormActions>
              </form>
            </Panel>
            <DataTable<Row>
              rows={withIds(blocks)}
              emptyMessage="No blocks yet."
              columns={[
                { key: 'name', header: 'Block', cell: (b) => <span className="text-sm font-medium">{display(b.name)}</span> },
                { key: 'phase', header: 'Phase', cell: (b) => <Muted>{phases.find((ph) => ph.id === b.phaseId)?.name || DASH}</Muted> },
                { key: 'order', header: 'Order', align: 'right', cell: (b) => <Mono>{display(b.sortOrder)}</Mono> },
                { key: 'rm', header: '', align: 'right', cell: (b) => <RemoveBtn label={`Remove ${b.name}`} onClick={() => void remove(() => api.projects.removeBlock(projectId!, String(b.id)), 'Block')} /> },
              ]}
            />
          </>
        )}

        {tab === 'plot-types' && (
          <>
            <Panel>
              <SectionTitle>Add plot type</SectionTitle>
              <form onSubmit={addPlotType}>
                <FormGrid className="lg:grid-cols-4">
                  <Field label="Name" required><NativeInput name="name" required placeholder="Standard 200" /></Field>
                  <Field label="Code"><NativeInput name="code" placeholder="STD200" /></Field>
                  <Field label="Area (sq yd)" required><NativeInput name="areaSqYd" required inputMode="decimal" defaultValue="200" /></Field>
                  <Field label="Category"><NativeInput name="category" placeholder="Residential" /></Field>
                </FormGrid>
                <FormActions><SubmitBtn icon={Plus}>Add plot type</SubmitBtn></FormActions>
              </form>
            </Panel>
            <DataTable<Row>
              rows={withIds(plotTypes)}
              emptyMessage="No plot types yet."
              columns={[
                { key: 'name', header: 'Plot type', cell: (pt) => <span className="text-sm font-medium">{display(pt.name)}</span> },
                { key: 'code', header: 'Code', cell: (pt) => <Mono>{display(pt.code)}</Mono> },
                { key: 'area', header: 'Area (sq yd)', align: 'right', cell: (pt) => <Mono>{display(pt.areaSqYd)}</Mono> },
                { key: 'category', header: 'Category', cell: (pt) => <Muted>{display(pt.category)}</Muted> },
                { key: 'rm', header: '', align: 'right', cell: (pt) => <RemoveBtn label={`Remove ${pt.name}`} onClick={() => void remove(() => api.projects.removePlotType(projectId!, String(pt.id)), 'Plot type')} /> },
              ]}
            />
          </>
        )}

        {tab === 'pricing' && (
          <Panel>
            <SectionTitle aside={pricing?.updatedAt ? `Updated ${formatDate(pricing.updatedAt)}` : 'Not configured'}>Pricing rules</SectionTitle>
            <form key={version} onSubmit={savePricing}>
              <FormGrid>
                <Field label="Base rate / sq yd (₹)" required>
                  <NativeInput name="baseRatePerSqYd" required inputMode="decimal" defaultValue={pricing?.baseRatePerSqYd || '25000'} />
                </Field>
                <Field label="Facing premium %">
                  <NativeInput name="facingPremiumPct" inputMode="decimal" defaultValue={String((pricing?.rulesJson as AnyRow)?.facingPremiumPct ?? 5)} />
                </Field>
                <Field label="Corner premium %">
                  <NativeInput name="cornerPremiumPct" inputMode="decimal" defaultValue={String((pricing?.rulesJson as AnyRow)?.cornerPremiumPct ?? 10)} />
                </Field>
              </FormGrid>
              <FormActions><SubmitBtn>Save pricing</SubmitBtn></FormActions>
            </form>
          </Panel>
        )}

        {tab === 'amenities' && (
          <>
            <Panel>
              <SectionTitle>Add amenity</SectionTitle>
              <form onSubmit={addAmenity}>
                <FormGrid>
                  <Field label="Name" required><NativeInput name="name" required placeholder="Clubhouse" /></Field>
                  <Field label="Group"><NativeInput name="groupName" placeholder="Lifestyle / Infra" /></Field>
                  <Field label="Status">
                    <NativeSelect name="status" defaultValue="PLANNED">
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="COMPLETED">Completed</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Description" className="sm:col-span-2 lg:col-span-3"><NativeInput name="description" /></Field>
                </FormGrid>
                <FormActions><SubmitBtn icon={Plus}>Add amenity</SubmitBtn></FormActions>
              </form>
            </Panel>
            <DataTable<Row>
              rows={withIds(amenities)}
              emptyMessage="No amenities yet."
              columns={[
                {
                  key: 'name',
                  header: 'Amenity',
                  cell: (a) => (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(a.name)}</p>
                      {a.description ? <Muted className="block truncate">{a.description}</Muted> : null}
                    </div>
                  ),
                },
                { key: 'group', header: 'Group', cell: (a) => <Muted>{display(a.groupName)}</Muted> },
                { key: 'status', header: 'Status', cell: (a) => <StatusChip value={a.status} /> },
                { key: 'rm', header: '', align: 'right', cell: (a) => <RemoveBtn label={`Remove ${a.name}`} onClick={() => void remove(() => api.projects.removeAmenity(projectId!, String(a.id)), 'Amenity')} /> },
              ]}
            />
          </>
        )}

        {tab === 'media' && (
          <>
            <Panel>
              <SectionTitle aside="Presigned object-storage upload">Upload media</SectionTitle>
              <form onSubmit={uploadMedia}>
                <FormGrid>
                  <Field label="Kind">
                    <NativeSelect name="kind" defaultValue="cover">
                      <option value="cover">Cover</option>
                      <option value="brochure">Brochure</option>
                      <option value="gallery">Gallery</option>
                    </NativeSelect>
                  </Field>
                  <Field label="Label"><NativeInput name="label" placeholder="Optional label" /></Field>
                  <Field label="File" required><NativeInput name="file" type="file" required /></Field>
                </FormGrid>
                <FormActions><SubmitBtn icon={Upload}>Upload</SubmitBtn></FormActions>
              </form>
            </Panel>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <SectionTitle>Cover & brochure</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <Fact label="Cover key"><Mono className="break-all">{display(project.coverImageKey)}</Mono></Fact>
                  <Fact label="Brochure key"><Mono className="break-all">{display(project.brochureKey)}</Mono></Fact>
                </div>
              </Panel>
              <Panel>
                <SectionTitle aside={`${gallery.length} items`}>Gallery</SectionTitle>
                {gallery.length === 0 ? (
                  <EmptyState compact icon={ImageIcon} title="No gallery images" description="Upload with kind “Gallery”." />
                ) : (
                  <ul className="space-y-1">
                    {gallery.map((g, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-surface-low">
                        <span className="truncate text-sm">{String(g.label || g.key)}</span>
                        <Muted>{String(g.mimeType || '')}</Muted>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        )}

        {tab === 'visibility' && (
          <Panel>
            <SectionTitle aside="Controls agent and customer app exposure">Visibility & publishing</SectionTitle>
            <form onSubmit={saveVisibility}>
              <div className="divide-y divide-outline-variant/30 rounded-xl bg-surface-low">
                {([
                  { key: 'agentVisible', label: 'Agent visible', hint: 'Channel partners can see and sell this project.' },
                  { key: 'customerListed', label: 'Customer listed', hint: 'Listed in the customer app catalogue.' },
                  { key: 'resaleAvailable', label: 'Resale available', hint: 'Owners may list plots for resale.' },
                ] as const).map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{row.label}</p>
                      <Muted>{row.hint}</Muted>
                    </div>
                    <SwitchControl
                      label={row.label}
                      checked={visibility[row.key]}
                      onCheckedChange={(next) => setVisibility((v) => ({ ...v, [row.key]: next }))}
                    />
                  </div>
                ))}
              </div>
              <FormGrid className="pt-5">
                <Field label="Lifecycle">
                  <NativeSelect value={visibility.lifecycleStatus} onChange={(e) => setVisibility((v) => ({ ...v, lifecycleStatus: e.target.value }))}>
                    {LIFECYCLES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                  </NativeSelect>
                </Field>
              </FormGrid>
              <FormActions><SubmitBtn>Publish settings</SubmitBtn></FormActions>
            </form>
          </Panel>
        )}

        {tab === 'layout' && (
          <>
            <Panel>
              <SectionTitle
                aside={
                  <LinkBtn to={layoutHref} variant="primary" className="min-h-9 text-xs">
                    Open layout editor <ArrowUpRight className="h-3.5 w-3.5" />
                  </LinkBtn>
                }
              >
                Interactive plot canvas
              </SectionTitle>
              {layouts.length === 0 && inventory.total === 0 ? (
                <EmptyState compact icon={MapIcon} title="No master plan yet" description="Upload a layout and map plot polygons in the layout editor." />
              ) : (
                <>
                  <PlotCanvas
                    className="plot-canvas-host"
                    readOnly
                    tool="select"
                    layoutImageUrl={layoutImageUrl}
                    plots={(plots.rows as AnyRow[]).map((pl): CanvasPlot => ({
                      id: String(pl.id),
                      number: String(pl.number || pl.plotNumber || ''),
                      status: String(pl.status || 'AVAILABLE'),
                      areaSqYd: pl.areaSqYd,
                      facing: pl.facing,
                      polygonJson: pl.polygonJson,
                    }))}
                  />
                  {layouts.length > 0 ? (
                    <ul className="grid gap-2 pt-4 sm:grid-cols-2">
                      {layouts.map((l) => (
                        <li key={l.id}>
                          <Link to={layoutHref} className="lift flex items-center gap-3 rounded-xl bg-surface-low p-3 transition-colors hover:bg-surface-c">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-lowest text-primary shadow-ambient">
                              <MapIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{display(l.name)}</span>
                              <Muted className="block truncate">
                                {l.widthPx && l.heightPx ? `${l.widthPx}x${l.heightPx}` : 'Size unknown'} · {l.imageKey ? 'Image linked' : 'No image'}
                              </Muted>
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </Panel>
            <Panel>
              <SectionTitle
                aside={
                  <LinkBtn to={`/projects/${projectId}/plots`} variant="tonal" className="min-h-9 text-xs">
                    Plot inventory <ArrowUpRight className="h-3.5 w-3.5" />
                  </LinkBtn>
                }
              >
                {`Plots · ${inventory.mapped} of ${inventory.total} mapped`}
              </SectionTitle>
              {plots.loading ? (
                <LoadingState variant="rows" rows={3} />
              ) : inventory.total === 0 ? (
                <EmptyState compact icon={Grid3x3} title="No plots yet" description="Plots created for this project appear here." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from(inventory.counts, ([status, count]) => (
                    <span key={status} className="inline-flex items-center gap-2 rounded-xl bg-surface-low px-3 py-2">
                      <PlotStatusChip status={status} />
                      <span className="numeric text-sm font-semibold" style={{ color: plotStatusColors(status).ink }}>{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}

        {tab === 'sales' && projectId && <SalesTab projectId={projectId} bookings={bookings} />}

        {tab === 'finance' && projectId && <FinanceTab projectId={projectId} bookings={bookings} />}

        {tab === 'documents' && projectId && <DocumentsPage projectId={projectId} />}

        {tab === 'team' && (
          <ComingSoonPanel
            icon={Users}
            title="Team"
            description="Team permissions for this project ship with workspace collaboration. Organisation members and roles are managed in Settings today."
            action={<LinkBtn to="/settings/users" variant="tonal">Organisation members <ArrowUpRight className="h-4 w-4" /></LinkBtn>}
          />
        )}

        {tab === 'activity' && (
          <ComingSoonPanel
            icon={Activity}
            title="Activity"
            description="A project-scoped activity feed ships with audit streaming. The organisation-wide audit log is available in Settings."
            action={<LinkBtn to="/settings/audit" variant="tonal">Open audit log <ArrowUpRight className="h-4 w-4" /></LinkBtn>}
          />
        )}
      </div>
    </>
  );
}

