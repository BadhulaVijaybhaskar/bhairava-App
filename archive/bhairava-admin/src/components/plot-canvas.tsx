import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import type { Plot, PlotStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const statusFill: Record<PlotStatus, string> = {
  available: "var(--surface-highest)",
  reserved: "color-mix(in oklab, var(--warning) 55%, var(--surface-lowest))",
  booked: "color-mix(in oklab, var(--secondary) 55%, var(--surface-lowest))",
  registered: "color-mix(in oklab, var(--primary) 65%, var(--surface-lowest))",
  resale: "color-mix(in oklab, var(--chart-5) 45%, var(--surface-lowest))",
};

export const statusLabel: Record<PlotStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  booked: "Booked",
  registered: "Registered",
  resale: "Resale",
};

interface Props {
  plots: Plot[];
  selectedId?: string | undefined;
  onSelect?: (plot: Plot) => void;
  hiddenStatuses?: Set<PlotStatus>;
  showNumbers?: boolean;
  className?: string;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 8;

export function PlotCanvas({
  plots,
  selectedId,
  onSelect,
  hiddenStatuses,
  showNumbers = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<Plot | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

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

  const visible = plots.filter((p) => !hiddenStatuses?.has(p.status));

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-low select-none",
        drag.current ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setOffset({
          x: drag.current.ox + (e.clientX - drag.current.x),
          y: drag.current.oy + (e.clientY - drag.current.y),
        });
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
    >
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0H0V4" fill="none" stroke="var(--outline-variant)" strokeOpacity="0.16" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        <g transform={`translate(${offset.x / 8} ${offset.y / 8}) scale(${zoom})`}>
          {visible.map((p) => {
            const active = p.id === selectedId;
            const cx = p.points.reduce((a, b) => a + b[0], 0) / p.points.length;
            const cy = p.points.reduce((a, b) => a + b[1], 0) / p.points.length;
            return (
              <g key={p.id} onPointerEnter={() => setHover(p)} onPointerLeave={() => setHover(null)}>
                <polygon
                  points={p.points.map((pt) => pt.join(",")).join(" ")}
                  fill={statusFill[p.status]}
                  stroke={active ? "var(--primary)" : "var(--surface-lowest)"}
                  strokeWidth={active ? 0.55 : 0.18}
                  className="cursor-pointer transition-[stroke,opacity]"
                  opacity={hover && hover.id !== p.id ? 0.92 : 1}
                  onClick={() => onSelect?.(p)}
                />
                {showNumbers && zoom > 1.6 && (
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={1.1}
                    fill="var(--on-surface-tint)"
                    opacity={0.75}
                    pointerEvents="none"
                  >
                    {p.number.split("-")[1]}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="glass absolute top-4 left-4 rounded-xl px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Legend
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5">
          {(Object.keys(statusFill) as PlotStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: statusFill[s] }} />
              {statusLabel[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="glass absolute right-4 bottom-4 flex items-center gap-1 rounded-xl p-1">
        <button className="rounded-lg p-1.5 hover:bg-surface-c" onClick={() => stepZoom(-1)}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="numeric w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
        <button className="rounded-lg p-1.5 hover:bg-surface-c" onClick={() => stepZoom(1)}>
          <Plus className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-1.5 hover:bg-surface-c" onClick={reset}>
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {hover && (
        <div className="glass pointer-events-none absolute bottom-4 left-4 rounded-xl px-3 py-2 text-xs">
          <p className="numeric font-medium">{hover.number}</p>
          <p className="text-muted-foreground">
            {hover.areaSqYd} sq.yd · {hover.facing} · {statusLabel[hover.status]}
          </p>
        </div>
      )}
    </div>
  );
}
