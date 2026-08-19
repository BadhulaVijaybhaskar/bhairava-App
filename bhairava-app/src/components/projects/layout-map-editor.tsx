"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Maximize2, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deleteLayoutShape, upsertLayoutShape } from "@/app/admin/projects/layout-actions";

type Point = [number, number];

type ShapeRow = {
  id: string;
  plotId: string;
  plotNumber: string;
  status: keyof typeof PLOT_STATUS_COLORS;
  shapeType: "RECT" | "POLYGON";
  coordinates: Point[];
};

type PlotOption = { id: string; plotNumber: string; status: keyof typeof PLOT_STATUS_COLORS };

export function LayoutMapEditor({
  projectId,
  layoutMapId,
  imageUrl,
  imageWidth,
  imageHeight,
  plots,
  shapes,
}: {
  projectId: string;
  layoutMapId: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  plots: PlotOption[];
  shapes: ShapeRow[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<"pan" | "rect" | "polygon">("pan");
  const [draft, setDraft] = useState<Point[]>([]);
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const filteredShapes = useMemo(() => {
    return shapes.filter((s) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (search && !s.plotNumber.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [shapes, statusFilter, search]);

  const aspect = imageWidth / Math.max(imageHeight, 1);

  const toNorm = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const el = containerRef.current?.querySelector("[data-layout-stage]") as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return [Number(x.toFixed(4)), Number(y.toFixed(4))];
    },
    [],
  );

  function onPointerDown(e: React.PointerEvent) {
    if (mode === "pan") {
      setDragging(true);
      setLast({ x: e.clientX, y: e.clientY });
      return;
    }
    const pt = toNorm(e.clientX, e.clientY);
    if (!pt) return;
    if (mode === "rect") {
      if (draft.length === 0) setDraft([pt]);
      else {
        const a = draft[0];
        const coords: Point[] = [a, [pt[0], a[1]], pt, [a[0], pt[1]]];
        void submitShape("RECT", coords);
        setDraft([]);
      }
      return;
    }
    setDraft((d) => [...d, pt]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || mode !== "pan") return;
    setPan((p) => ({
      x: p.x + (e.clientX - last.x),
      y: p.y + (e.clientY - last.y),
    }));
    setLast({ x: e.clientX, y: e.clientY });
  }

  function onPointerUp() {
    setDragging(false);
  }

  async function submitShape(shapeType: "RECT" | "POLYGON", coordinates: Point[]) {
    if (!plotId) return;
    const fd = new FormData();
    fd.set("layoutMapId", layoutMapId);
    fd.set("plotId", plotId);
    fd.set("shapeType", shapeType);
    fd.set("coordinates", JSON.stringify(coordinates));
    fd.set("projectId", projectId);
    await upsertLayoutShape(fd);
  }

  function finishPolygon() {
    if (draft.length < 3) return;
    void submitShape("POLYGON", draft);
    setDraft([]);
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  const shellClass = fullscreen
    ? "fixed inset-0 z-50 flex flex-col bg-white"
    : "surface flex flex-col overflow-hidden";

  return (
    <div className={shellClass} ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2.5">
        <div className="flex gap-1">
          {(
            [
              ["pan", "Pan"],
              ["rect", "Rect"],
              ["polygon", "Polygon"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setDraft([]);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                mode === m ? "bg-primary text-white" : "bg-canvas text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          className="input-field !h-9 !py-1 !pl-2 text-xs"
          value={plotId}
          onChange={(e) => setPlotId(e.target.value)}
        >
          {plots.map((p) => (
            <option key={p.id} value={p.id}>
              {p.plotNumber} · {p.status}
            </option>
          ))}
        </select>
        <input
          className="input-field !h-9 max-w-[140px] !py-1 !pl-2 text-xs"
          placeholder="Search plot"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field !h-9 !py-1 !pl-2 text-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(PLOT_STATUS_COLORS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-1">
          {mode === "polygon" && draft.length >= 3 ? (
            <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" onClick={finishPolygon}>
              Save polygon
            </button>
          ) : null}
          <button type="button" className="rounded-lg border border-border p-1.5" onClick={() => setZoom((z) => Math.min(3, z + 0.15))} aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg border border-border p-1.5" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg border border-border p-1.5" onClick={resetView} aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg border border-border p-1.5" onClick={() => setFullscreen((f) => !f)} aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
          <Link href={`/admin/projects/${projectId}`} className="rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-primary">
            Back
          </Link>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-[var(--surface-low)]" style={{ minHeight: fullscreen ? undefined : 420 }}>
        <div
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            data-layout-stage
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              width: `min(100%, ${640 * zoom}px)`,
              aspectRatio: `${aspect}`,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Site plan" className="pointer-events-none absolute inset-0 h-full w-full object-contain" draggable={false} />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              {filteredShapes.map((s) => {
                const color = PLOT_STATUS_COLORS[s.status]?.hex ?? "#64748B";
                const points = s.coordinates.map((c) => c.join(",")).join(" ");
                return (
                  <g key={s.id}>
                    <polygon points={points} fill={`${color}55`} stroke={color} strokeWidth={0.004} />
                    <text
                      x={s.coordinates.reduce((a, c) => a + c[0], 0) / s.coordinates.length}
                      y={s.coordinates.reduce((a, c) => a + c[1], 0) / s.coordinates.length}
                      fontSize="0.035"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#0b1220"
                      className="pointer-events-none"
                    >
                      {s.plotNumber}
                    </text>
                  </g>
                );
              })}
              {draft.length > 0 ? (
                <polyline
                  points={draft.map((c) => c.join(",")).join(" ")}
                  fill="none"
                  stroke="#0B3D91"
                  strokeWidth={0.005}
                  strokeDasharray="0.02 0.01"
                />
              ) : null}
            </svg>
          </div>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto border-t border-border/70 px-3 py-2">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Linked shapes ({shapes.length})
        </p>
        <ul className="space-y-1">
          {shapes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {s.plotNumber}
                <span className="ml-2 font-medium text-muted-foreground">{s.shapeType}</span>
              </span>
              <form action={deleteLayoutShape}>
                <input type="hidden" name="shapeId" value={s.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <button type="submit" className="rounded-md p-1 text-red-600 hover:bg-red-50" aria-label="Delete shape">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(PLOT_STATUS_COLORS).slice(0, 6).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: v.hex }} />
              {v.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
