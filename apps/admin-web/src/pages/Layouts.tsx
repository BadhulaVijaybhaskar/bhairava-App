import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hand, MousePointer2, PenTool, RotateCw, Save, Spline, Unlink, X } from 'lucide-react';
import {
  Btn,
  Chip,
  DataTable,
  Field,
  PageHeader,
  Panel,
  PlotStatusChip,
  SectionTitle,
  SelectInput,
  Tabs,
  type TabItem,
} from '@bhairava/ui-web';
import { isMappedPolygon, type NormPoint } from '@bhairava/domain';
import { api } from '../api';
import { PlotCanvas, type CanvasPlot, type CanvasTool } from '../PlotCanvas';
import { FormActions, Mono, Muted, Notice } from '../components/common';
import { DASH, display, errMsg, shortId, useAsyncList, withIds, type AnyRow } from '../lib/data';

type Row = AnyRow & { id: string | number };

const TOOL_TABS: TabItem<CanvasTool>[] = [
  { key: 'pan', label: 'Pan', icon: Hand },
  { key: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'draw', label: 'Draw', icon: PenTool },
  { key: 'edit', label: 'Edit', icon: Spline },
];

export function LayoutsPage() {
  const [search] = useSearchParams();
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [projectId, setProjectId] = useState(search.get('projectId') || '');
  const [layouts, setLayouts] = useState<AnyRow[]>([]);
  const [plots, setPlots] = useState<AnyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [tool, setTool] = useState<CanvasTool>('select');
  const [draftPoints, setDraftPoints] = useState<NormPoint[]>([]);
  const [editablePoints, setEditablePoints] = useState<NormPoint[] | null>(null);
  const [layoutImageUrl, setLayoutImageUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId && projects.rows[0]?.id) setProjectId(projects.rows[0].id);
  }, [projects.rows, projectId]);

  const reload = useCallback(() => {
    if (!projectId) return;
    setErr('');
    Promise.all([api.layouts.list(projectId), api.plots.listByProject(projectId)])
      .then(([l, p]) => {
        setLayouts(Array.isArray(l) ? l : []);
        setPlots(Array.isArray(p) ? p : []);
        const first = Array.isArray(l) ? l[0] : null;
        const meta = first?.metaJson as AnyRow | undefined;
        setLayoutImageUrl(
          (first?.downloadUrl as string) ||
            (meta?.publicUrl as string) ||
            (meta?.url as string) ||
            null,
        );
      })
      .catch((e) => setErr(errMsg(e)));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const canvasPlots: CanvasPlot[] = plots.map((p) => ({
    id: p.id,
    number: String(p.number || p.plotNumber || ''),
    status: String(p.status || 'AVAILABLE'),
    areaSqYd: p.areaSqYd,
    facing: p.facing,
    polygonJson: p.polygonJson,
  }));

  const selected = plots.find((p) => p.id === selectedId) || null;
  const mappedCount = plots.filter((p) => isMappedPolygon(p.polygonJson)).length;

  function changeTool(t: CanvasTool) {
    setTool(t);
    if (t === 'edit' && selected && isMappedPolygon(selected.polygonJson)) {
      setEditablePoints(selected.polygonJson as NormPoint[]);
    }
    if (t !== 'edit') setEditablePoints(null);
    if (t !== 'draw') setDraftPoints([]);
  }

  async function savePolygon(points: NormPoint[], replaceExisting = true) {
    if (!selectedId) { setErr('Select a plot first'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.plots.setPolygon(selectedId, { points, replaceExisting, layoutId: layouts[0]?.id });
      setMsg('Polygon saved to live API');
      setDraftPoints([]);
      setTool('select');
      setEditablePoints(null);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function clearPolygon() {
    if (!selectedId) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.plots.clearPolygon(selectedId);
      setMsg('Polygon cleared');
      setEditablePoints(null);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function selectPlot(id: string) {
    setSelectedId(id);
    setTool('select');
    setEditablePoints(null);
    setDraftPoints([]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Layouts & mapping"
        description="Map plot polygons over the master plan. Draw: click vertices, double-click to finish. Edit: drag vertices, then save."
        actions={
          <Btn variant="tonal" onClick={reload} disabled={busy}>
            <RotateCw className="h-4 w-4" /> Reload
          </Btn>
        }
      />

      <Panel tonal className="mb-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-end">
          <Field label="Project">
            <SelectInput
              value={projectId}
              onChange={(v) => { setProjectId(v); setSelectedId(undefined); }}
              options={projects.rows.map((p) => ({ value: String(p.id), label: String(p.name) }))}
              placeholder={projects.loading ? 'Loading projects…' : 'Select project'}
            />
          </Field>
          <div>
            <p className="pb-1 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Tool</p>
            <Tabs items={TOOL_TABS} value={tool} onChange={changeTool} aria-label="Canvas tool" className="w-fit max-w-full" />
          </div>
        </div>
      </Panel>

      <div className="space-y-2 pb-4">
        <Notice tone="err">{err}</Notice>
        <Notice tone="ok">{msg}</Notice>
      </div>

      <Panel>
        <SectionTitle aside={`${mappedCount} of ${plots.length} mapped`}>Interactive map</SectionTitle>
        <PlotCanvas
          className="plot-canvas-host"
          plots={canvasPlots}
          selectedId={selectedId}
          onSelect={(p) => selectPlot(p.id)}
          layoutImageUrl={layoutImageUrl}
          tool={tool}
          draftPoints={draftPoints}
          onDraftChange={setDraftPoints}
          onDraftComplete={(pts) => { void savePolygon(pts, true); }}
          editablePoints={editablePoints}
          onEditablePointsChange={setEditablePoints}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            Selected:{' '}
            {selected ? (
              <span className="inline-flex flex-wrap items-center gap-2 text-foreground">
                <span className="numeric font-medium">{display(selected.number)}</span>
                <PlotStatusChip status={selected.status} />
                <Chip tone={selected.polygonJson ? 'positive' : 'neutral'}>{selected.polygonJson ? 'Mapped' : 'Unmapped'}</Chip>
              </span>
            ) : (
              'none'
            )}
          </p>
          <FormActions className="pt-0">
            <Btn variant="primary" disabled={busy || !selectedId || draftPoints.length < 3} onClick={() => void savePolygon(draftPoints, true)}>
              <Save className="h-4 w-4" /> Save draft polygon
            </Btn>
            <Btn
              variant="primary"
              disabled={busy || !selectedId || !editablePoints || editablePoints.length < 3}
              onClick={() => editablePoints && void savePolygon(editablePoints, true)}
            >
              <Spline className="h-4 w-4" /> Save edited vertices
            </Btn>
            <Btn variant="danger" disabled={busy || !selectedId || !selected?.polygonJson} onClick={() => void clearPolygon()}>
              <Unlink className="h-4 w-4" /> Unlink polygon
            </Btn>
            <Btn disabled={!draftPoints.length} onClick={() => setDraftPoints([])}>
              <X className="h-4 w-4" /> Clear draft
            </Btn>
          </FormActions>
        </div>
      </Panel>

      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionTitle aside={`${layouts.length} layouts`}>Master plans</SectionTitle>
          <DataTable<Row>
            rows={withIds(layouts)}
            emptyMessage="No layout rows yet — the canvas still works against plot polygons."
            columns={[
              { key: 'name', header: 'Name', cell: (l) => <span className="text-sm font-medium">{l.name || l.label || DASH}</span> },
              { key: 'size', header: 'Size', cell: (l) => <Mono>{l.widthPx && l.heightPx ? `${l.widthPx}×${l.heightPx}` : DASH}</Mono> },
              { key: 'id', header: 'Id', cell: (l) => <Mono className="text-muted-foreground">{shortId(l.id)}</Mono> },
            ]}
          />
        </div>
        <div className="min-w-0">
          <SectionTitle aside={`${plots.length} plots`}>Plot polygons</SectionTitle>
          <DataTable<Row>
            rows={withIds(plots)}
            emptyMessage="No plots for this project."
            columns={[
              {
                key: 'number',
                header: 'Plot',
                cell: (p) => (
                  <span className="inline-flex items-center gap-2">
                    <span className="numeric text-sm font-medium">{display(p.number || p.plotNumber)}</span>
                    {p.id === selectedId ? <Chip tone="info">Selected</Chip> : null}
                  </span>
                ),
              },
              { key: 'status', header: 'Status', cell: (p) => <PlotStatusChip status={p.status} /> },
              { key: 'polygon', header: 'Polygon', cell: (p) => (p.polygonJson ? <Chip tone="positive">Mapped</Chip> : <Muted>{DASH}</Muted>) },
              {
                key: 'select',
                header: '',
                align: 'right',
                cell: (p) => (
                  <Btn className="min-h-9 px-3 text-xs" variant={p.id === selectedId ? 'tonal' : 'ghost'} onClick={() => selectPlot(String(p.id))}>
                    {p.id === selectedId ? 'Selected' : 'Select'}
                  </Btn>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
