import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  MousePointer2,
  PenTool,
  Link2,
  Unlink2,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowLeftRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlotCanvas, type CanvasTool } from "@/components/plot-canvas";
import { Btn } from "@/components/kit";
import { byId, type Plot } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  PLOT_STATUSES,
  PLOT_STATUS_LABEL,
  type CanonicalPlotStatus,
  toCanonicalPlotStatus,
} from "@/lib/domain/plot-status";
import {
  canonicalPlotStatusFill,
} from "@/lib/plot-status-colors";
import {
  linkPolygonToPlot,
  unlinkPolygonFromPlot,
  relinkPolygon,
  plotHasActiveMapping,
  polygonsEqual,
  type NormPoint,
} from "@/lib/domain/plot-mapping";
import { canEditPlotMaster } from "@/lib/domain/project-permissions";

export const Route = createFileRoute("/plots/editor")({
  validateSearch: (search: Record<string, unknown>): { projectId?: string } => {
    const projectId = typeof search["projectId"] === "string" ? search["projectId"] : undefined;
    return projectId ? { projectId } : {};
  },
  head: () => ({
    meta: [
      { title: "Layout Mapping Editor — Bhairava" },
      {
        name: "description",
        content: "Draw, edit, link and persist plot polygons on the master plan (1:1 mapping).",
      },
      { property: "og:title", content: "Layout Mapping Editor — Bhairava" },
    ],
  }),
  component: PlotsEditorPage,
});

type Tool = "select" | "draw" | "edit";

const TOOLS: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "draw", label: "Draw polygon", icon: PenTool },
  { id: "edit", label: "Edit vertices", icon: ArrowLeftRight },
];

function PlotsEditorPage() {
  const { plots: allPlots, projects, savePlot, saveProject } = useData();
  const search = Route.useSearch();
  const session = getSession();
  const canEdit = canEditPlotMaster(session?.role);
  const projectId = search.projectId ?? "PRJ-01";
  const project = byId(projects, projectId);

  const plots = useMemo(
    () => allPlots.filter((p) => p.projectId === projectId),
    [allPlots, projectId],
  );

  const [tool, setTool] = useState<Tool>("select");
  const [hidden, setHidden] = useState<Set<CanonicalPlotStatus>>(new Set());
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [draftPoints, setDraftPoints] = useState<NormPoint[]>([]);
  const [editablePoints, setEditablePoints] = useState<NormPoint[] | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [localPoints, setLocalPoints] = useState<Record<string, NormPoint[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [relinkTargetId, setRelinkTargetId] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [layoutUrlDraft, setLayoutUrlDraft] = useState(project?.layoutImage ?? "");

  useEffect(() => {
    setLayoutUrlDraft(project?.layoutImage ?? "");
  }, [project?.layoutImage, project?.id]);

  const workingPlots: Plot[] = useMemo(
    () =>
      plots.map((p) =>
        localPoints[p.id] ? { ...p, points: localPoints[p.id]! } : p,
      ),
    [plots, localPoints],
  );

  const selected = byId(workingPlots, selectedId);

  useEffect(() => {
    if (!selected) {
      setEditablePoints(null);
      return;
    }
    if (tool === "edit" && plotHasActiveMapping(selected)) {
      setEditablePoints(selected.points.map((pt) => [pt[0], pt[1]] as NormPoint));
    } else {
      setEditablePoints(null);
    }
  }, [selectedId, tool]); // eslint-disable-line react-hooks/exhaustive-deps

  const markDirty = (id: string, points: NormPoint[]) => {
    setLocalPoints((prev) => ({ ...prev, [id]: points }));
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  const applySelection = (p: Plot) => {
    setSelectedId(p.id);
    setError(null);
    setConfirmUnlink(false);
    setNotice(null);
  };

  const toggleStatus = (s: CanonicalPlotStatus) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const canvasTool: CanvasTool =
    tool === "draw" ? "draw" : tool === "edit" ? "edit" : "select";

  const onDraftComplete = (pts: NormPoint[]) => {
    setDraftPoints(pts);
    setNotice(`Draft polygon ready (${pts.length} vertices). Link it to an unmapped plot.`);
    setTool("select");
  };

  const doLink = () => {
    setError(null);
    setNotice(null);
    if (!canEdit) {
      setError("Finance/Viewer/Agent cannot edit layout mapping.");
      return;
    }
    const target = byId(workingPlots, linkTargetId);
    if (!target) {
      setError("Pick a plot to link.");
      return;
    }
    const result = linkPolygonToPlot({ plot: target, points: draftPoints });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    markDirty(target.id, result.points);
    setDraftPoints([]);
    setSelectedId(target.id);
    setNotice(`Linked polygon → ${target.number}. Save to persist.`);
  };

  const doUnlink = () => {
    setError(null);
    if (!canEdit || !selected) return;
    if (!confirmUnlink) {
      setConfirmUnlink(true);
      return;
    }
    const result = unlinkPolygonFromPlot();
    markDirty(selected.id, result.points);
    setConfirmUnlink(false);
    setEditablePoints(null);
    setNotice(`Unlinked ${selected.number}. Save to persist.`);
  };

  const doRelink = () => {
    setError(null);
    setNotice(null);
    if (!canEdit || !selected) return;
    const target = byId(workingPlots, relinkTargetId);
    if (!target) {
      setError("Pick a target plot for relink.");
      return;
    }
    const result = relinkPolygon({ source: selected, target });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    markDirty(selected.id, result.sourcePoints);
    markDirty(target.id, result.targetPoints);
    setSelectedId(target.id);
    setRelinkTargetId("");
    setNotice(`Moved polygon ${selected.number} → ${target.number}. Save to persist.`);
  };

  const saveGeometry = () => {
    setError(null);
    if (!canEdit) {
      setError("Read-only role.");
      return;
    }
    for (const id of dirtyIds) {
      const base = byId(plots, id);
      const pts = localPoints[id];
      if (!base || !pts) continue;
      // Skip no-op
      if (polygonsEqual(base.points, pts)) continue;
      savePlot({ ...base, points: pts });
    }
    setDirtyIds(new Set());
    setLocalPoints({});
    setNotice("Geometry saved (localStorage). Reload will restore mappings.");
  };

  const cancelUnsaved = () => {
    setLocalPoints({});
    setDirtyIds(new Set());
    setDraftPoints([]);
    setEditablePoints(null);
    setConfirmUnlink(false);
    setError(null);
    setNotice("Discarded unsaved mapping changes.");
  };

  const persistEditable = () => {
    if (!selected || !editablePoints) return;
    const result = linkPolygonToPlot({
      plot: { ...selected, points: [] },
      points: editablePoints,
      replaceExisting: true,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    markDirty(selected.id, result.points);
    setNotice(`Vertex edits staged for ${selected.number}. Save to persist.`);
  };

  const unmapped = workingPlots.filter((p) => !plotHasActiveMapping(p));
  const mapped = workingPlots.filter((p) => plotHasActiveMapping(p));

  const saveMasterPlan = () => {
    if (!canEdit || !project) return;
    const next = { ...project };
    const url = layoutUrlDraft.trim();
    if (url) next.layoutImage = url;
    else delete next.layoutImage;
    saveProject(next);
    setNotice(url ? "Master plan URL saved on project." : "Master plan cleared.");
  };

  const onUploadImage = (file: File | null) => {
    if (!file || !canEdit || !project) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      setLayoutUrlDraft(url);
      saveProject({ ...project, layoutImage: url });
      setNotice("Master plan image uploaded and saved.");
    };
    reader.readAsDataURL(file);
  };

  if (!canEdit) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <h1 className="font-display text-xl font-semibold">Mapping editor</h1>
          <p className="pt-2 text-sm text-muted-foreground">
            Founder / Administrator only. Finance and Viewer use read-only layout; Agent has no Admin mapping edit.
          </p>
          <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: "layout" }} className="mt-4 inline-block text-sm text-primary">
            Back to Layout & Plots
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell bleed>
      <div className="flex flex-col gap-3 p-4 pb-24 lg:h-[calc(100vh-4rem)] lg:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {project?.code ?? projectId} · Mapping editor
            </p>
            <h1 className="font-display text-lg font-semibold">
              {project?.name ?? "Project"} — 1:1 polygon ↔ plot
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(dirtyIds.size > 0 || draftPoints.length > 0) && (
              <Btn variant="ghost" onClick={cancelUnsaved}>
                <RotateCcw className="h-4 w-4" /> Cancel unsaved
              </Btn>
            )}
            {dirtyIds.size > 0 && (
              <Btn variant="primary" onClick={saveGeometry}>
                <Save className="h-4 w-4" /> Save geometry ({dirtyIds.size})
              </Btn>
            )}
          </div>
        </div>

        {(error || notice) && (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-foreground",
            )}
          >
            {error ?? notice}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <aside className="flex w-full shrink-0 flex-row items-center gap-2 overflow-x-auto rounded-2xl bg-surface-low px-3 py-2 lg:w-16 lg:flex-col lg:px-0 lg:py-4">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
                type="button"
                onClick={() => setTool(t.id)}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                  tool === t.id ? "bg-primary/14 text-primary" : "text-muted-foreground hover:bg-surface-c",
                )}
              >
                <t.icon className="h-4.5 w-4.5" />
              </button>
            ))}
          </aside>

          <div className="h-[48vh] min-w-0 flex-1 lg:h-auto">
            <PlotCanvas
              plots={workingPlots}
              selectedId={selectedId}
              onSelect={applySelection}
              hiddenStatuses={hidden}
              showNumbers
              layoutImageUrl={project?.layoutImage ?? null}
              draftPoints={draftPoints}
              tool={canvasTool}
              onDraftChange={setDraftPoints}
              onDraftComplete={onDraftComplete}
              editablePoints={editablePoints}
              onEditablePointsChange={setEditablePoints}
              className="h-full w-full"
            />
            {tool === "draw" && (
              <p className="pt-1 text-xs text-muted-foreground">
                Click to add vertices · double-click to close (≥3). Then link to an unmapped plot.
              </p>
            )}
            {tool === "edit" && selected && (
              <div className="flex gap-2 pt-1">
                <Btn variant="tonal" onClick={persistEditable}>
                  Apply vertex edits
                </Btn>
                <p className="text-xs text-muted-foreground self-center">Drag handles on the selected polygon.</p>
              </div>
            )}
          </div>

          <aside className="grid w-full shrink-0 gap-3 sm:grid-cols-2 lg:flex lg:w-80 lg:flex-col lg:overflow-y-auto">
            <div className="panel p-4">
              <p className="pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Master plan
              </p>
              <input
                value={layoutUrlDraft}
                onChange={(e) => setLayoutUrlDraft(e.target.value)}
                placeholder="Image URL or data URL"
                className="mb-2 w-full rounded-lg bg-surface-low px-2.5 py-1.5 text-xs outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <Btn variant="tonal" onClick={saveMasterPlan}>
                  Set URL
                </Btn>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-surface-c px-3 py-2 text-xs font-medium">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadImage(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <div className="panel p-4">
              <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Status layers (9)
              </p>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {PLOT_STATUSES.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-surface-low"
                  >
                    <span className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: canonicalPlotStatusFill[s] }} />
                      {PLOT_STATUS_LABEL[s]}
                    </span>
                    <button type="button" onClick={() => toggleStatus(s)} className="text-muted-foreground hover:text-foreground">
                      {hidden.has(s) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-tonal p-4 space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Link / unlink / relink
              </p>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  Draft vertices: {draftPoints.length}
                  {draftPoints.length >= 3 ? " · ready" : ""}
                </p>
                <select
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface-low px-2 py-1.5 text-sm"
                >
                  <option value="">Unmapped plot…</option>
                  {unmapped.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number}
                    </option>
                  ))}
                </select>
                {draftPoints.length >= 3 && (
                  <Btn variant="primary" className="mt-2 w-full" onClick={doLink}>
                    <Link2 className="h-4 w-4" /> Link draft → plot
                  </Btn>
                )}
              </div>

              {selected && (
                <>
                  <div className="border-t border-outline-variant/20 pt-3">
                    <p className="text-sm font-medium">{selected.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {plotHasActiveMapping(selected) ? "Mapped" : "Unmapped"} ·{" "}
                      {PLOT_STATUS_LABEL[toCanonicalPlotStatus(selected.canonicalStatus ?? selected.status)]}
                    </p>
                    {plotHasActiveMapping(selected) && (
                      <Btn
                        variant={confirmUnlink ? "primary" : "ghost"}
                        className="mt-2 w-full"
                        onClick={doUnlink}
                      >
                        <Unlink2 className="h-4 w-4" />
                        {confirmUnlink ? "Confirm unlink" : "Unlink polygon"}
                      </Btn>
                    )}
                    {confirmUnlink && (
                      <button type="button" className="mt-1 text-xs text-muted-foreground underline" onClick={() => setConfirmUnlink(false)}>
                        Cancel
                      </button>
                    )}
                  </div>
                  <div>
                    <select
                      value={relinkTargetId}
                      onChange={(e) => setRelinkTargetId(e.target.value)}
                      className="w-full rounded-lg bg-surface-low px-2 py-1.5 text-sm"
                    >
                      <option value="">Relink to unmapped…</option>
                      {unmapped
                        .filter((p) => p.id !== selected.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.number}
                          </option>
                        ))}
                    </select>
                    {plotHasActiveMapping(selected) && (
                      <Btn variant="tonal" className="mt-2 w-full" onClick={doRelink}>
                        Relink → other plot
                      </Btn>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="panel p-4 text-xs text-muted-foreground">
              <p>
                Mapped {mapped.length} · Unmapped {unmapped.length} · Dirty {dirtyIds.size}
              </p>
              <p className="pt-1">One plot → one active sellable polygon. Duplicate active mappings are rejected.</p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
