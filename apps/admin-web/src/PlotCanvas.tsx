import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LAYOUT_VIEWBOX,
  PLOT_STATUSES,
  canonicalPlotStatusFill,
  canonicalPlotStatusLabel,
  clientToNormMeet,
  fillForPlotStatus,
  isMappedPolygon,
  labelForPlotStatus,
  toCanonicalPlotStatus,
  type CanonicalPlotStatus,
  type NormPoint,
} from '@bhairava/domain';

export type CanvasTool = 'pan' | 'select' | 'draw' | 'edit';

export type CanvasPlot = {
  id: string;
  number: string;
  status: string;
  areaSqYd?: number | string;
  facing?: string | null;
  polygonJson?: unknown;
};

type Props = {
  plots: CanvasPlot[];
  selectedId?: string;
  onSelect?: (plot: CanvasPlot) => void;
  layoutImageUrl?: string | null;
  draftPoints?: NormPoint[];
  tool?: CanvasTool;
  onDraftChange?: (points: NormPoint[]) => void;
  onDraftComplete?: (points: NormPoint[]) => void;
  editablePoints?: NormPoint[] | null;
  onEditablePointsChange?: (points: NormPoint[]) => void;
  hiddenStatuses?: Set<CanonicalPlotStatus>;
  showNumbers?: boolean;
  readOnly?: boolean;
  className?: string;
};

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 8;

function pointsOf(plot: CanvasPlot): NormPoint[] | null {
  const raw = plot.polygonJson;
  if (!isMappedPolygon(raw)) return null;
  return raw as NormPoint[];
}

export function PlotCanvas({
  plots,
  selectedId,
  onSelect,
  layoutImageUrl,
  draftPoints = [],
  tool = 'select',
  onDraftChange,
  onDraftComplete,
  editablePoints,
  onEditablePointsChange,
  hiddenStatuses,
  showNumbers = true,
  readOnly = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<CanvasPlot | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const vertexDrag = useRef<{ index: number } | null>(null);
  const [imgError, setImgError] = useState(false);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  useEffect(() => {
    setImgError(false);
  }, [layoutImageUrl]);

  const mapPointer = useCallback((clientX: number, clientY: number): NormPoint => {
    const el = containerRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    const { zoom: z, offset: o } = stateRef.current;
    // pan is in CSS pixels; convert to viewBox units after meet mapping
    const panX = (o.x / Math.max(1, rect.width)) * 100;
    const panY = (o.y / Math.max(1, rect.height)) * 100;
    return clientToNormMeet({
      clientX,
      clientY,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      panX,
      panY,
      zoom: z,
    });
  }, []);

  const zoomAt = useCallback((px: number, py: number, next: number) => {
    const { zoom: z, offset: o } = stateRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const k = clamped / z;
    setZoom(clamped);
    setOffset({ x: px - (px - o.x) * k, y: py - (py - o.y) * k });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, stateRef.current.zoom * Math.exp(-dy * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

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
    const c = toCanonicalPlotStatus(p.status);
    return !hiddenStatuses?.has(c);
  });

  const hasImage = !!layoutImageUrl && !imgError;
  const cursor =
    tool === 'draw' ? 'crosshair' : tool === 'edit' ? 'default' : drag.current ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      className={`plot-canvas ${className || ''}`}
      style={{ touchAction: 'none', cursor }}
      onPointerDown={(e) => {
        if (tool === 'edit' && vertexDrag.current) return;
        if (tool === 'draw' || tool === 'edit') return;
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (tool === 'edit' && vertexDrag.current && editablePoints && onEditablePointsChange) {
          const pt = mapPointer(e.clientX, e.clientY);
          onEditablePointsChange(editablePoints.map((p, i) => (i === vertexDrag.current!.index ? pt : p)));
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
        if (readOnly || tool !== 'draw' || !onDraftComplete) return;
        e.preventDefault();
        if (draftPoints.length >= 3) onDraftComplete(draftPoints);
      }}
      onClick={(e) => {
        if (readOnly || tool !== 'draw' || !onDraftChange) return;
        const pt = mapPointer(e.clientX, e.clientY);
        onDraftChange([...draftPoints, pt]);
      }}
    >
      <svg className="plot-canvas-svg" viewBox={LAYOUT_VIEWBOX} preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="plot-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0H0V4" fill="none" stroke="#94a3b8" strokeOpacity="0.25" strokeWidth="0.15" />
          </pattern>
          <filter id="plot-sel-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.35" floodColor="#1d4ed8" floodOpacity="0.55" />
          </filter>
        </defs>
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
            <rect width="100" height="100" fill="url(#plot-grid)" />
          )}

          {visible.map((p) => {
            const mapped = pointsOf(p);
            if (!mapped) return null;
            const active = p.id === selectedId;
            const pts = active && editablePoints && editablePoints.length >= 3 ? editablePoints : mapped;
            const cx = pts.reduce((a, b) => a + b[0], 0) / pts.length;
            const cy = pts.reduce((a, b) => a + b[1], 0) / pts.length;
            return (
              <g
                key={p.id}
                onPointerEnter={() => setHover(p)}
                onPointerLeave={() => setHover(null)}
              >
                <polygon
                  points={pts.map((pt) => pt.join(',')).join(' ')}
                  fill={fillForPlotStatus(p.status)}
                  stroke={active ? '#1d4ed8' : '#ffffff'}
                  strokeWidth={active ? 0.7 : 0.18}
                  opacity={hover && hover.id !== p.id ? 0.88 : 1}
                  filter={active ? 'url(#plot-sel-glow)' : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onSelect?.(p);
                  }}
                />
                {showNumbers && zoom > 1.05 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={1.15}
                    fill="#0f172a"
                    opacity={0.85}
                    fontWeight={active ? 700 : 500}
                    pointerEvents="none"
                  >
                    {p.number.includes('-') ? p.number.split('-').pop() : p.number}
                  </text>
                )}
                {active &&
                  tool === 'edit' &&
                  editablePoints &&
                  editablePoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt[0]}
                      cy={pt[1]}
                      r={0.7}
                      fill="#1d4ed8"
                      stroke="#fff"
                      strokeWidth={0.2}
                      style={{ cursor: 'move' }}
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
                  points={draftPoints.map((p) => p.join(',')).join(' ')}
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth={0.35}
                  strokeDasharray="1 0.6"
                />
              )}
              {draftPoints.length >= 3 && (
                <polygon
                  points={draftPoints.map((p) => p.join(',')).join(' ')}
                  fill="rgba(29,78,216,0.28)"
                  stroke="#1d4ed8"
                  strokeWidth={0.4}
                />
              )}
              {draftPoints.map((pt, i) => (
                <circle key={i} cx={pt[0]} cy={pt[1]} r={0.55} fill="#1d4ed8" />
              ))}
            </g>
          )}
        </g>
      </svg>

      {!hasImage && (
        <div className="plot-canvas-empty">
          <p><strong>No master plan underlay</strong></p>
          <p className="muted">Grid fallback — polygons still map in 0–100 viewBox with xMidYMid meet hit-testing.</p>
        </div>
      )}

      <div className="plot-canvas-legend">
        <p className="k">Legend</p>
        <div className="plot-canvas-legend-row">
          {PLOT_STATUSES.map((s) => (
            <span key={s} className="plot-canvas-legend-item">
              <span className="swatch" style={{ background: canonicalPlotStatusFill[s] }} />
              {canonicalPlotStatusLabel[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="plot-canvas-zoom">
        <button type="button" className="btn ghost" onClick={() => stepZoom(-1)}>-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" className="btn ghost" onClick={() => stepZoom(1)}>+</button>
        <button type="button" className="btn ghost" onClick={reset} title="Reset zoom">Reset</button>
      </div>

      {hover && (
        <div className="plot-canvas-hover">
          <p><strong>{hover.number}</strong></p>
          <p className="muted">
            {String(hover.areaSqYd ?? '—')} sq.yd · {hover.facing || '—'} · {labelForPlotStatus(hover.status)}
          </p>
        </div>
      )}

      {layoutImageUrl ? (
        <img
          src={layoutImageUrl}
          alt=""
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          onError={() => setImgError(true)}
        />
      ) : null}
    </div>
  );
}
