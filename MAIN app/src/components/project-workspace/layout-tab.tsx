import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, LayoutGrid, Plus, PenTool } from "lucide-react";
import { PlotCanvas } from "@/components/plot-canvas";
import { Btn, Chip, FilterBar, Panel, SectionTitle } from "@/components/kit";
import {
  Field,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
  EditSheet,
} from "@/components/form-kit";
import type { Facing, Plot, Project } from "@/lib/mock-data";
import { byId, formatINR } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import { defaultPricing, FACINGS } from "@/lib/project-config";
import {
  PLOT_STATUSES,
  PLOT_STATUS_LABEL,
  type CanonicalPlotStatus,
  toCanonicalPlotStatus,
  toLegacyPlotStatus,
} from "@/lib/domain/plot-status";
import {
  applyStatusTransition,
  allowedTargets,
  validateBulkTransitions,
} from "@/lib/domain/plot-transitions";
import { calculatePlotPrice, applyPriceOverride, clearPriceOverride } from "@/lib/domain/plot-pricing";
import {
  CORNER_CODES,
  CORNER_LABEL,
  toCanonicalCorner,
  toLegacyCornerLabel,
  type CanonicalCorner,
} from "@/lib/domain/plot-corner";
import {
  canEditPlotMaster,
  canChangePlotStatus,
  canCreatePlot,
  canOverridePlotPrice,
  type LayoutAccess,
} from "@/lib/domain/project-permissions";
import {
  projectPlotForRole,
  customerDisplayName,
} from "@/lib/domain/plot-pii";

type Row = Plot & { canonical: CanonicalPlotStatus };

function statusTone(s: CanonicalPlotStatus): "positive" | "info" | "warning" | "danger" | "neutral" {
  switch (s) {
    case "AVAILABLE":
    case "RESALE_AVAILABLE":
      return "positive";
    case "RESERVED":
    case "UNDER_DOCUMENTATION":
      return "warning";
    case "BOOKED":
    case "SOLD":
    case "REGISTERED":
      return "info";
    case "BLOCKED":
    case "CANCELLED":
      return "danger";
    default:
      return "neutral";
  }
}

function Unavailable({ note }: { note?: string }) {
  return <span className="text-xs italic text-muted-foreground">{note ?? "Unavailable"}</span>;
}

function AccessDenied() {
  return (
    <Panel className="text-center">
      <SectionTitle>Layout access denied</SectionTitle>
      <p className="pt-2 text-sm text-muted-foreground">
        Customer roles cannot open Layout &amp; Plots in MAIN. Use Founder / Administrator /
        Finance / Viewer (or Agent inventory view).
      </p>
    </Panel>
  );
}

export function ProjectLayoutTab({
  project,
  plots,
  access,
}: {
  project: Project;
  plots: Plot[];
  access: LayoutAccess;
}) {
  if (access === "denied") return <AccessDenied />;

  const session = getSession();
  const { savePlot, nextId, customers, agents } = useData();
  const canEdit = canEditPlotMaster(session?.role) && access === "full";
  const canStatus = canChangePlotStatus(session?.role) && access === "full";
  const canAdd = canCreatePlot(session?.role) && access === "full";
  const canOverride = canOverridePlotPrice(session?.role);
  const readOnly = !canEdit;
  const actorId = session?.email ?? "admin";

  const pricing = project.pricing ?? defaultPricing();
  const plotTypes = project.plotTypes ?? [];

  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [blockFilter, setBlockFilter] = useState("All");
  const [facingFilter, setFacingFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [bulkTo, setBulkTo] = useState<CanonicalPlotStatus | "">("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows: Row[] = useMemo(
    () =>
      plots.map((p) => ({
        ...p,
        canonical: toCanonicalPlotStatus(p.canonicalStatus ?? p.status),
      })),
    [plots],
  );

  const phases = useMemo(() => {
    const set = new Set<string>();
    for (const p of rows) if (p.phase) set.add(p.phase);
    for (const ph of project.phases ?? []) set.add(ph.name);
    return ["All", ...[...set].sort()];
  }, [rows, project.phases]);

  const blocks = useMemo(() => {
    const set = new Set<string>();
    for (const p of rows) if (p.block) set.add(p.block);
    for (const b of project.blocks ?? []) set.add(b.name);
    return ["All", ...[...set].sort()];
  }, [rows, project.blocks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (statusFilter !== "All" && p.canonical !== statusFilter) return false;
      if (phaseFilter !== "All" && (p.phase ?? "") !== phaseFilter) return false;
      if (blockFilter !== "All" && (p.block ?? "") !== blockFilter) return false;
      if (facingFilter !== "All" && p.facing !== facingFilter) return false;
      if (q && !`${p.number} ${p.block ?? ""} ${p.phase ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, statusFilter, phaseFilter, blockFilter, facingFilter, query]);

  const statusViews = ["All", ...PLOT_STATUSES.map((s) => PLOT_STATUS_LABEL[s])];
  const statusViewToKey = (label: string): string => {
    if (label === "All") return "All";
    return PLOT_STATUSES.find((s) => PLOT_STATUS_LABEL[s] === label) ?? "All";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const applyBulk = () => {
    setBulkError(null);
    if (!canStatus) {
      setBulkError("Your role cannot change plot status.");
      return;
    }
    if (!bulkTo) {
      setBulkError("Pick a target status.");
      return;
    }
    const items = filtered
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, from: p.canonical }));
    if (items.length === 0) {
      setBulkError("Select at least one plot.");
      return;
    }
    const results = validateBulkTransitions(items, bulkTo, bulkReason, actorId);
    const failed = results.filter((r) => !r.result.ok);
    if (failed.length) {
      const first = failed[0]?.result;
      setBulkError(
        `${failed.length} of ${results.length} failed. First: ${
          first && !first.ok ? first.error : ""
        }`,
      );
      return;
    }
    for (const r of results) {
      if (!r.result.ok) continue;
      const plot = plots.find((p) => p.id === r.id);
      if (!plot) continue;
      const entry = r.result.entry;
      const history = [
        ...(plot.statusHistory ?? []),
        {
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          reason: entry.reason,
          actorId: entry.actorId,
          source: entry.source,
          createdAt: entry.createdAt,
        },
      ];
      savePlot({
        ...plot,
        status: toLegacyPlotStatus(r.result.to) as Plot["status"],
        canonicalStatus: r.result.to,
        statusHistory: history,
      });
    }
    setSelectedIds(new Set());
    setBulkReason("");
    setBulkTo("");
  };

  const drawerPlot = drawerId ? rows.find((p) => p.id === drawerId) : undefined;

  return (
    <div className="space-y-4">
      {access === "read" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Layout &amp; Plots is <span className="font-medium text-foreground">read-only</span> for
          your role (Finance / Viewer). Founder and Administrator can edit.
        </div>
      )}
      {access === "inventory" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Agent inventory view — status and pricing visible; master create/edit disabled in MAIN.
        </div>
      )}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <SectionTitle>Interactive layout</SectionTitle>
              <p className="pt-1 text-sm text-muted-foreground">
                Master plan underlay + SVG plot overlay — zoom/pan move together. Canonical 9 statuses.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                to="/plots/editor"
                search={{ projectId: project.id }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface-c px-3 py-2 text-sm font-medium"
              >
                <PenTool className="h-4 w-4" /> Mapping editor
              </Link>
            )}
            <Link
              to="/plots/layout"
              search={{ projectId: project.id }}
              className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Fullscreen layout <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="h-[min(560px,55vh)] w-full overflow-hidden rounded-xl border border-outline-variant/20 shadow-ambient">
          <PlotCanvas
            plots={filtered}
            selectedId={drawerId ?? undefined}
            onSelect={(p) => setDrawerId(p.id)}
            showNumbers
            layoutImageUrl={project.layoutImage ?? null}
            className="h-full w-full"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} plot{filtered.length === 1 ? "" : "s"} matching current filters.
          {!canEdit && " Mapping editor is Founder/Admin only."}
        </p>
      </Panel>

      <FilterBar
        views={statusViews}
        active={
          statusFilter === "All"
            ? "All"
            : PLOT_STATUS_LABEL[statusFilter as CanonicalPlotStatus]
        }
        onSelect={(label) => setStatusFilter(statusViewToKey(label))}
        query={query}
        onQuery={setQuery}
        placeholder="Search plot #, block, phase…"
        right={
          canAdd ? (
            <Btn variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add plot
            </Btn>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          className="h-9 rounded-xl bg-surface-low px-3 text-xs"
        >
          {phases.map((p) => (
            <option key={p} value={p}>
              {p === "All" ? "All phases" : p}
            </option>
          ))}
        </select>
        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="h-9 rounded-xl bg-surface-low px-3 text-xs"
        >
          {blocks.map((b) => (
            <option key={b} value={b}>
              {b === "All" ? "All blocks" : b}
            </option>
          ))}
        </select>
        <select
          value={facingFilter}
          onChange={(e) => setFacingFilter(e.target.value)}
          className="h-9 rounded-xl bg-surface-low px-3 text-xs"
        >
          <option value="All">All facings</option>
          {FACINGS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <p className="flex items-center text-xs text-muted-foreground numeric">
          {filtered.length} plot{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {canStatus && selectedIds.size > 0 && (
        <Panel className="flex flex-wrap items-end gap-3">
          <Field label={`Bulk status (${selectedIds.size})`}>
            <SelectInput
              value={bulkTo}
              onChange={(v) => setBulkTo(v as CanonicalPlotStatus)}
              options={PLOT_STATUSES.map((s) => ({ value: s, label: PLOT_STATUS_LABEL[s] }))}
              placeholder="Target status"
            />
          </Field>
          <Field label="Reason (required)">
            <TextInput value={bulkReason} onChange={setBulkReason} placeholder="Why this change?" />
          </Field>
          <Btn variant="primary" onClick={applyBulk}>
            Apply
          </Btn>
          <Btn variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Btn>
          {bulkError && <p className="w-full text-sm text-destructive">{bulkError}</p>}
        </Panel>
      )}

      <Panel className="overflow-hidden p-0">
        <div className="max-h-[min(640px,60vh)] overflow-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-low/95 backdrop-blur-sm text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <tr>
                {canStatus && (
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="px-3 py-3">Plot #</th>
                <th className="px-3 py-3">Phase</th>
                <th className="px-3 py-3">Block</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Area</th>
                <th className="px-3 py-3">Facing</th>
                <th className="px-3 py-3">Corner</th>
                <th className="px-3 py-3 text-right">Price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Customer</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canStatus ? 11 : 10}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    No plots match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const price = calculatePlotPrice(
                    {
                      areaSqYd: p.areaSqYd,
                      facing: p.facing,
                      corner: p.corner ?? null,
                      roadWidthFt: p.roadWidthFt ?? null,
                      features: p.features ?? [],
                      rateOverride: p.rateOverride ?? null,
                    },
                    pricing,
                  );
                  const typeName =
                    (p.typeId && plotTypes.find((t) => t.id === p.typeId)?.name) ||
                    p.plotType ||
                    null;
                  const projected = projectPlotForRole(p, {
                    role: session?.role,
                    sessionEmail: session?.email,
                    customers,
                    agentEmailToId: Object.fromEntries(
                      agents.filter((a) => a.email).map((a) => [a.email!.toLowerCase(), a.id]),
                    ),
                  });
                  const corner = p.corner ? toCanonicalCorner(p.corner) : null;
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-outline-variant/10 hover:bg-surface-low/40"
                      onClick={() => setDrawerId(p.id)}
                    >
                      {canStatus && (
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            aria-label={`Select ${p.number}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2.5 font-medium numeric">{p.number}</td>
                      <td className="px-3 py-2.5">{p.phase ?? <Unavailable />}</td>
                      <td className="px-3 py-2.5">{p.block ?? <Unavailable />}</td>
                      <td className="px-3 py-2.5">{typeName ?? <Unavailable />}</td>
                      <td className="px-3 py-2.5 text-right numeric">{p.areaSqYd}</td>
                      <td className="px-3 py-2.5">{p.facing}</td>
                      <td className="px-3 py-2.5">
                        {corner ? CORNER_LABEL[corner] : <Unavailable />}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="numeric">{formatINR(price.total)}</span>
                          {price.isManualOverride && (
                            <Chip tone="warning">Manual price</Chip>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Chip tone={statusTone(p.canonical)}>
                          {PLOT_STATUS_LABEL[p.canonical]}
                        </Chip>
                      </td>
                      <td className="px-3 py-2.5">
                        {customerDisplayName(projected.customerView) === "—" ? (
                          <Unavailable note="—" />
                        ) : (
                          customerDisplayName(projected.customerView)
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {drawerPlot && (
        <PlotDetailDrawer
          plot={drawerPlot}
          project={project}
          readOnly={readOnly}
          canStatus={canStatus}
          canOverride={canOverride}
          actorId={actorId}
          onClose={() => setDrawerId(null)}
          onSave={(next) => {
            savePlot(next);
            setDrawerId(next.id);
          }}
        />
      )}

      {createOpen && canAdd && (
        <CreatePlotSheet
          project={project}
          plots={plots}
          nextId={nextId}
          onClose={() => setCreateOpen(false)}
          onCreate={(p) => {
            savePlot(p);
            setCreateOpen(false);
            setDrawerId(p.id);
          }}
        />
      )}
    </div>
  );
}

function PlotDetailDrawer({
  plot,
  project,
  readOnly,
  canStatus,
  canOverride,
  actorId,
  onClose,
  onSave,
}: {
  plot: Row;
  project: Project;
  readOnly: boolean;
  canStatus: boolean;
  canOverride: boolean;
  actorId: string;
  onClose: () => void;
  onSave: (p: Plot) => void;
}) {
  const pricing = project.pricing ?? defaultPricing();
  const template = plot.typeId
    ? (project.plotTypes ?? []).find((t) => t.id === plot.typeId)
    : undefined;

  const [facing, setFacing] = useState<Facing>(plot.facing);
  const [area, setArea] = useState(plot.areaSqYd);
  const [lengthFt, setLengthFt] = useState(plot.lengthFt ?? 0);
  const [widthFt, setWidthFt] = useState(plot.widthFt ?? 0);
  const [corner, setCorner] = useState<CanonicalCorner>(toCanonicalCorner(plot.corner));
  const [roadWidthFt, setRoadWidthFt] = useState(plot.roadWidthFt ?? 0);
  const [features, setFeatures] = useState((plot.features ?? []).join(", "));
  const [statusTo, setStatusTo] = useState<CanonicalPlotStatus | "">("");
  const [statusReason, setStatusReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [overrideRate, setOverrideRate] = useState(plot.rateOverride ?? 0);
  const [overrideReason, setOverrideReason] = useState(plot.rateOverrideReason ?? "");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideActive, setOverrideActive] = useState(
    plot.rateOverride != null && plot.rateOverride > 0,
  );

  const featureList = features
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const price = calculatePlotPrice(
    {
      areaSqYd: area,
      facing,
      corner,
      roadWidthFt: roadWidthFt || null,
      features: featureList,
      rateOverride: overrideActive
        ? overrideRate || plot.rateOverride || null
        : null,
    },
    pricing,
  );

  const targets = allowedTargets(plot.canonical);

  const saveMaster = () => {
    if (readOnly) return;
    // Preserve hard override on attribute edits — never silent wipe
    const next: Plot = {
      ...plot,
      facing,
      areaSqYd: area,
      corner: toLegacyCornerLabel(corner),
      features: featureList,
      pricePerSqYd:
        overrideActive && plot.rateOverride ? plot.rateOverride : price.ratePerSqYd,
    };
    if (lengthFt) next.lengthFt = lengthFt;
    else delete next.lengthFt;
    if (widthFt) next.widthFt = widthFt;
    else delete next.widthFt;
    if (roadWidthFt) next.roadWidthFt = roadWidthFt;
    else delete next.roadWidthFt;
    if (overrideActive && plot.rateOverride != null) {
      next.rateOverride = plot.rateOverride;
      if (plot.rateOverrideReason) next.rateOverrideReason = plot.rateOverrideReason;
    } else {
      delete next.rateOverride;
      delete next.rateOverrideReason;
    }
    onSave(next);
  };

  const changeStatus = () => {
    setStatusError(null);
    if (!canStatus || !statusTo) return;
    const result = applyStatusTransition({
      from: plot.canonical,
      to: statusTo,
      reason: statusReason,
      actorId,
      source: "ADMIN_MANUAL",
    });
    if (!result.ok) {
      setStatusError(result.error);
      return;
    }
    const entry = result.entry;
    const history = [
      ...(plot.statusHistory ?? []),
      {
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        reason: entry.reason,
        actorId: entry.actorId,
        source: entry.source,
        createdAt: entry.createdAt,
      },
    ];
    onSave({
      ...plot,
      status: toLegacyPlotStatus(result.to) as Plot["status"],
      canonicalStatus: result.to,
      statusHistory: history,
    });
    setStatusTo("");
    setStatusReason("");
  };

  const saveOverride = () => {
    setOverrideError(null);
    const result = applyPriceOverride({
      newRate: overrideRate,
      reason: overrideReason,
      canOverride,
    });
    if (!result.ok) {
      setOverrideError(result.error);
      return;
    }
    setOverrideActive(true);
    onSave({
      ...plot,
      rateOverride: result.rate,
      rateOverrideReason: result.reason,
      pricePerSqYd: result.rate,
    });
  };

  const clearOverride = () => {
    setOverrideError(null);
    const result = clearPriceOverride(canOverride);
    if (!result.ok) {
      setOverrideError(result.error);
      return;
    }
    const recalc = calculatePlotPrice(
      {
        areaSqYd: area,
        facing,
        corner,
        roadWidthFt: roadWidthFt || null,
        features: featureList,
        rateOverride: null,
      },
      pricing,
    );
    setOverrideActive(false);
    setOverrideRate(0);
    setOverrideReason("");
    const cleared: Plot = { ...plot, pricePerSqYd: recalc.ratePerSqYd };
    delete cleared.rateOverride;
    delete cleared.rateOverrideReason;
    onSave(cleared);
  };

  return (
    <EditSheet
      open
      onClose={onClose}
      title={`Plot ${plot.number}`}
      description={`${project.code} · ${PLOT_STATUS_LABEL[plot.canonical]}`}
      onSave={readOnly ? onClose : saveMaster}
    >
      <div className="space-y-4">
        {template && (
          <div className="rounded-lg bg-surface-low px-3 py-2 text-xs text-muted-foreground">
            Template: <span className="font-medium text-foreground">{template.name}</span>
            {" · "}
            base {template.areaSqYd} sq yd
            {template.lengthFt ? ` · ${template.lengthFt}×${template.widthFt} ft` : ""}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Area (sq yd)">
            <NumberInput value={area} onChange={setArea} />
            {template && area !== template.areaSqYd && (
              <p className="pt-1 text-[10px] text-amber-700">
                Override vs template {template.areaSqYd}
              </p>
            )}
          </Field>
          <Field label="Facing">
            <SelectInput
              value={facing}
              onChange={(v) => setFacing(v as Facing)}
              options={[...FACINGS]}
            />
          </Field>
          <Field label="Length (ft)">
            <NumberInput value={lengthFt} onChange={setLengthFt} />
          </Field>
          <Field label="Width (ft)">
            <NumberInput value={widthFt} onChange={setWidthFt} />
          </Field>
          <Field label="Corner">
            <SelectInput
              value={corner}
              onChange={(v) => setCorner(v as CanonicalCorner)}
              options={CORNER_CODES.map((c) => ({ value: c, label: CORNER_LABEL[c] }))}
            />
          </Field>
          <Field label="Road width (ft)">
            <NumberInput value={roadWidthFt} onChange={setRoadWidthFt} />
          </Field>
        </div>
        <Field label="Features (comma-separated)">
          <TextInput
            value={features}
            onChange={setFeatures}
            placeholder="Park facing, Main road facing"
          />
        </Field>

        <div className="rounded-xl bg-surface-low p-3">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Price
          </p>
          <p className="numeric pt-1 text-lg font-semibold">{formatINR(price.total)}</p>
          <p className="numeric text-xs text-muted-foreground">
            {formatINR(price.ratePerSqYd)} / sq yd
            {price.isManualOverride ? " · Manual override" : " · From rules"}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {price.lines.map((l) => (
              <li key={l.label} className="flex justify-between gap-2">
                <span>{l.label}</span>
                <span className="numeric">{formatINR(l.amount)}</span>
              </li>
            ))}
          </ul>
          {price.isManualOverride && <Chip tone="warning">Manual price</Chip>}
        </div>

        {canOverride && (
          <div className="space-y-2 rounded-xl border border-outline-variant/30 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Hard price override
            </p>
            <Field label="Override rate (₹/sq yd)">
              <NumberInput value={overrideRate} onChange={setOverrideRate} />
            </Field>
            <Field label="Reason">
              <TextareaInput
                value={overrideReason}
                onChange={setOverrideReason}
                placeholder="Required"
              />
            </Field>
            <div className="flex gap-2">
              <Btn variant="tonal" onClick={saveOverride}>
                Apply override
              </Btn>
              {overrideActive && (
                <Btn variant="ghost" onClick={clearOverride}>
                  Clear override
                </Btn>
              )}
            </div>
            {overrideError && <p className="text-sm text-destructive">{overrideError}</p>}
          </div>
        )}

        {canStatus && (
          <div className="space-y-2 rounded-xl border border-outline-variant/30 p-3">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Status change (allow-list)
            </p>
            <p className="text-xs text-muted-foreground">
              Current: {PLOT_STATUS_LABEL[plot.canonical]}
            </p>
            <Field label="New status">
              <SelectInput
                value={statusTo}
                onChange={(v) => setStatusTo(v as CanonicalPlotStatus)}
                options={targets.map((s) => ({ value: s, label: PLOT_STATUS_LABEL[s] }))}
                placeholder="Allowed transitions only"
              />
            </Field>
            <Field label="Reason (required for ADMIN_MANUAL)">
              <TextareaInput
                value={statusReason}
                onChange={setStatusReason}
                placeholder="Why?"
              />
            </Field>
            <Btn variant="primary" onClick={changeStatus}>
              Change status
            </Btn>
            {statusError && <p className="text-sm text-destructive">{statusError}</p>}
            {(plot.statusHistory?.length ?? 0) > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  History
                </p>
                <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {[...(plot.statusHistory ?? [])].reverse().map((h, i) => (
                    <li key={`${h.createdAt}-${i}`}>
                      {h.fromStatus} → {h.toStatus} · {h.reason || "—"} · {h.actorId}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {readOnly && (
          <p className="text-xs text-muted-foreground">
            Read-only — edits disabled for your role.
          </p>
        )}
      </div>
    </EditSheet>
  );
}

function CreatePlotSheet({
  project,
  plots,
  nextId,
  onClose,
  onCreate,
}: {
  project: Project;
  plots: Plot[];
  nextId: (prefix: string, list: { id: string }[]) => string;
  onClose: () => void;
  onCreate: (p: Plot) => void;
}) {
  const [number, setNumber] = useState("");
  const [area, setArea] = useState(200);
  const [facing, setFacing] = useState<Facing>("East");
  const [block, setBlock] = useState(project.blocks?.[0]?.name ?? "A");
  const [phase, setPhase] = useState(project.phases?.[0]?.name ?? "");
  const [typeId, setTypeId] = useState(project.plotTypes?.[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    setError(null);
    const num =
      number.trim() || `${project.code}-${String(plots.length + 1).padStart(3, "0")}`;
    if (plots.some((p) => p.number === num)) {
      setError("Plot number already exists.");
      return;
    }
    const tpl = (project.plotTypes ?? []).find((t) => t.id === typeId);
    const id = nextId("PLT-", plots);
    const pricing = project.pricing ?? defaultPricing();
    const price = calculatePlotPrice(
      {
        areaSqYd: tpl?.areaSqYd ?? area,
        facing,
        corner: "NONE",
        features: [],
      },
      pricing,
    );
    const created: Plot = {
      id,
      number: num,
      projectId: project.id,
      areaSqYd: tpl?.areaSqYd ?? area,
      facing,
      pricePerSqYd: price.ratePerSqYd,
      status: "available",
      canonicalStatus: "AVAILABLE",
      points: [
        [10, 10],
        [18, 10],
        [18, 18],
        [10, 18],
      ],
      block,
      corner: "Not corner",
      features: [],
      plotType: tpl?.category === "Premium" ? "Premium" : "Standard",
    };
    if (phase) created.phase = phase;
    if (typeId) created.typeId = typeId;
    if (tpl?.lengthFt != null) created.lengthFt = tpl.lengthFt;
    if (tpl?.widthFt != null) created.widthFt = tpl.widthFt;
    onCreate(created);
  };

  return (
    <EditSheet
      open
      onClose={onClose}
      title="Add plot"
      description={project.name}
      onSave={create}
    >
      <div className="space-y-3">
        <Field label="Plot number">
          <TextInput
            value={number}
            onChange={setNumber}
            placeholder={`${project.code}-101`}
          />
        </Field>
        <Field label="Plot type (template)">
          <SelectInput
            value={typeId}
            onChange={setTypeId}
            options={(project.plotTypes ?? []).map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Optional template"
          />
        </Field>
        <Field label="Area (sq yd)">
          <NumberInput value={area} onChange={setArea} />
        </Field>
        <Field label="Facing">
          <SelectInput
            value={facing}
            onChange={(v) => setFacing(v as Facing)}
            options={[...FACINGS]}
          />
        </Field>
        <Field label="Block">
          <TextInput value={block} onChange={setBlock} />
        </Field>
        <Field label="Phase">
          <TextInput value={phase} onChange={setPhase} />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </EditSheet>
  );
}
