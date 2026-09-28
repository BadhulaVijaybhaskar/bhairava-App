import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import type { Plot } from "@/lib/mock-data";
import {
  canonicalPlotStatusFill,
  canonicalPlotStatusLabel,
  plotStatusFill,
  plotStatusLabel,
  fillForPlotStatus,
  labelForPlotStatus,
} from "@/lib/plot-status-colors";
import {
  PLOT_STATUSES,
  type CanonicalPlotStatus,
  toCanonicalPlotStatus,
} from "@/lib/domain/plot-status";
import { LAYOUT_VIEWBOX, isMappedPolygon, type NormPoint } from "@/lib/domain/plot-mapping";
import { cn } from "@/lib/utils";

/** @deprecated Prefer canonical* / labelForPlotStatus — legacy 5-status aliases for older routes. */
export const statusFill = plotStatusFill;
export const statusLabel = plotStatusLabel;

export type CanvasTool = "pan" | "select" | "draw" | "edit";

interface Props {
  plots: Plot[];
  selectedId?: string | undefined;
  onSelect?: (plot: Plot) => void;
  /** Canonical status tokens to hide from the overlay. */
  hiddenStatuses?: Set<CanonicalPlotStatus>;
  showNumbers?: boolean;
  className?: string;
  /** Master plan underlay URL (data URL or http). */
  layoutImageUrl?: string | null | undefined;
  /** Draft polygon being drawn / edited (normalized). */
  draftPoints?: NormPoint[];
  tool?: CanvasTool;
  onDraftChange?: (points: NormPoint[]) => void;
  onDraftComplete?: (points: NormPoint[]) => void;
  /** Vertex drag while editing selected plot local draft. */
  editablePoints?: NormPoint[] | null | undefined;
  onEditablePointsChange?: (points: NormPoint[]) => void;
  readOnly?: boolean;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 8;

function clientToNorm(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  zoom: number,
  offset: { x: number; y: number },
): NormPoint {
  const rect = el.getBoundingClientRect();
  // Map screen → viewBox 0–100 with same translate/scale as the SVG group.
  // Approximate using meet + mid: use full element as 100×100 before transform.
  const sx = ((clientX - rect.left - offset.x) / Math.max(1, rect.width)) * 100 / zoom;
  const sy = ((clientY - rect.top - offset.y) / Math.max(1, rect.height)) * 100 / zoom;
  return [
    Math.min(100, Math.max(0, Math.round(sx * 100) / 100)),
    Math.min(100, Math.max(0, Math.round(sy * 100) / 100)),
  ];
}

export function PlotCanvas({
  plots,
  selectedId,
  onSelect,
  hiddenStatuses,
  showNumbers = true,
  className,
  layoutImageUrl,
  draftPoints = [],
  tool = "select",
  onDraftChange,
  onDraftComplete,
  editablePoints,
  onEditablePointsChange,
  readOnly = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<Plot | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const vertexDrag = useRef<{ index: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  useEffect(() => {
    setImgError(false);
  }, [layoutImageUrl]);

  const zoomAt = useCallback((px: number, py: number, next: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const k = clamped / z;
    setZoom(clamped);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  const wheelRef = useRef((e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, stateRef.current.zoom * Math.exp(-dy * 0.0015));
  });
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, stateRef.current.zoom * Math.exp(-dy * 0.0015));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const stepZoom = (dir: 1 | -1) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, stateRef.current.zoom * (dir === 1 ? 1.3 : 1 / 1.3));
  };

  const visible = plots.filter((p) => {
    const c = toCanonicalPlotStatus(p.canonicalStatus ?? p.status);
    return !hiddenStatuses?.has(c);
  });

  const hasImage = !!layoutImageUrl && !imgError;
  const cursorClass =
    tool === "draw" ? "cursor-crosshair" : tool === "edit" ? "cursor-default" : drag.current ? "cursor-grabbing" : "cursor-grab";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-low select-none",
        cursorClass,
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (tool === "edit" && vertexDrag.current) return;
        if (tool === "draw" || tool === "edit") return;
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const el = containerRef.current;
        if (tool === "edit" && vertexDrag.current && el && editablePoints && onEditablePointsChange) {
          const pt = clientToNorm(el, e.clientX, e.clientY, zoom, offset);
          const next = editablePoints.map((p, i) => (i === vertexDrag.current!.index ? pt : p));
          onEditablePointsChange(next);
          return;
        }
        if (!drag.current) return;
        setOffset({
          x: drag.current.ox + (e.clientX - drag.current.x),
          y: drag.current.oy + (e.clientY - drag.current.y),
        });
      }}
      onPointerUp={() => {
        drag.current = null;
        vertexDrag.current = null;
      }}
      onDoubleClick={(e) => {
        if (readOnly || tool !== "draw" || !onDraftComplete) return;
        e.preventDefault();
        if (draftPoints.length >= 3) onDraftComplete(draftPoints);
      }}
      onClick={(e) => {
        if (readOnly || tool !== "draw" || !onDraftChange) return;
        const el = containerRef.current;
        if (!el) return;
        // Ignore clicks that were pans (movement handled separately)
        const pt = clientToNorm(el, e.clientX, e.clientY, zoom, offset);
        onDraftChange([...draftPoints, pt]);
      }}
    >
      <svg
        className="h-full w-full"
        viewBox={LAYOUT_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path
              d="M4 0H0V4"
              fill="none"
              stroke="var(--outline-variant)"
              strokeOpacity="0.16"
              strokeWidth="0.15"
            />
          </pattern>
        </defs>

        {/* Transform group: image + polygons move together on zoom/pan */}
        <g
          transform={`translate(${(offset.x / Math.max(1, containerRef.current?.clientWidth ?? 800)) * 100} ${(offset.y / Math.max(1, containerRef.current?.clientHeight ?? 600)) * 100}) scale(${zoom})`}
        >
          {hasImage ? (
            <image
              href={layoutImageUrl!}
              x={0}
              y={0}
              width={100}
              height={100}
              preserveAspectRatio="xMidYMid meet"
              opacity={0.92}
            />
          ) : (
            <rect width="100" height="100" fill="url(#grid)" />
          )}

          {visible.map((p) => {
            if (!isMappedPolygon(p.points)) return null;
            const active = p.id === selectedId;
            const pts =
              active && editablePoints && editablePoints.length >= 3 ? editablePoints : p.points;
            const cx = pts.reduce((a, b) => a + b[0], 0) / pts.length;
            const cy = pts.reduce((a, b) => a + b[1], 0) / pts.length;
            return (
              <g
                key={p.id}
                onPointerEnter={() => setHover(p)}
                onPointerLeave={() => setHover(null)}
              >
                <polygon
                  points={pts.map((pt) => pt.join(",")).join(" ")}
                  fill={fillForPlotStatus(p.canonicalStatus ?? p.status)}
                  stroke={active ? "var(--primary)" : "var(--surface-lowest)"}
                  strokeWidth={active ? 0.7 : 0.18}
                  className="cursor-pointer transition-[stroke,opacity]"
                  opacity={hover && hover.id !== p.id ? 0.88 : 1}
                  filter={active ? "url(#selGlow)" : undefined}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelect?.(p);
                  }}
                />
                {showNumbers && zoom > 1.2 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={1.15}
                    fill="var(--on-surface-tint)"
                    opacity={0.85}
                    fontWeight={active ? 700 : 500}
                    pointerEvents="none"
                  >
                    {p.number.includes("-") ? p.number.split("-").pop() : p.number}
                  </text>
                )}
                {active && tool === "edit" && editablePoints &&
                  editablePoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt[0]}
                      cy={pt[1]}
                      r={0.7}
                      fill="var(--primary)"
                      stroke="var(--surface-lowest)"
                      strokeWidth={0.2}
                      className="cursor-move"
                      onPointerDown={(ev) => {
                        ev.stopPropagation();
                        vertexDrag.current = { index: i };
                        (ev.target as Element).setPointerCapture?.(ev.pointerId);
                      }}
                    />
                  ))}
              </g>
            );
          })}

          {draftPoints.length > 0 && (
            <g>
              {draftPoints.length >= 2 && (
                <polyline
                  points={draftPoints.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={0.35}
                  strokeDasharray="1 0.6"
                />
              )}
              {draftPoints.length >= 3 && (
                <polygon
                  points={draftPoints.map((p) => p.join(",")).join(" ")}
                  fill="color-mix(in oklab, var(--primary) 28%, transparent)"
                  stroke="var(--primary)"
                  strokeWidth={0.4}
                />
              )}
              {draftPoints.map((pt, i) => (
                <circle key={i} cx={pt[0]} cy={pt[1]} r={0.55} fill="var(--primary)" />
              ))}
            </g>
          )}
        </g>

        <defs>
          <filter id="selGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.35" floodColor="var(--primary)" floodOpacity="0.55" />
          </filter>
        </defs>
      </svg>

      {!hasImage && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2 px-6 text-center">
          <p className="text-sm font-medium text-foreground/80">No master plan uploaded</p>
          <p className="pt-1 text-xs text-muted-foreground">
            Grid fallback for demo — set Layout image in Setup → Media (URL or upload).
          </p>
        </div>
      )}

      <div className="glass absolute top-4 left-4 max-w-[min(100%,32rem)] rounded-xl px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Legend
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
          {PLOT_STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: canonicalPlotStatusFill[s] }}
              />
              {canonicalPlotStatusLabel[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="glass absolute right-4 bottom-4 flex items-center gap-1 rounded-xl p-1">
        <button type="button" className="rounded-lg p-1.5 hover:bg-surface-c" onClick={() => stepZoom(-1)}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="numeric w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
        <button type="button" className="rounded-lg p-1.5 hover:bg-surface-c" onClick={() => stepZoom(1)}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" className="rounded-lg p-1.5 hover:bg-surface-c" onClick={reset} title="Reset zoom">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {hover && (
        <div className="glass pointer-events-none absolute bottom-4 left-4 rounded-xl px-3 py-2 text-xs">
          <p className="numeric font-medium">{hover.number}</p>
          <p className="text-muted-foreground">
            {hover.areaSqYd} sq.yd · {hover.facing} ·{" "}
            {labelForPlotStatus(hover.canonicalStatus ?? hover.status)}
          </p>
        </div>
      )}

      {/* Hidden img to detect load errors for underlay */}
      {layoutImageUrl ? (
        <img
          src={layoutImageUrl}
          alt=""
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          onError={() => setImgError(true)}
        />
      ) : null}
    </div>
  );
}
