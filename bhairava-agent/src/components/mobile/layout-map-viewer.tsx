"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { PLOT_STATUS_COLORS } from "@/lib/constants";

type Point = [number, number];

export type LayoutShape = {
  id: string;
  plotId: string;
  plotNumber: string;
  status: keyof typeof PLOT_STATUS_COLORS;
  coordinates: Point[];
  labelX?: number | null;
  labelY?: number | null;
};

export function LayoutMapViewer({
  imageUrl,
  imageWidth,
  imageHeight,
  shapes,
  statusFilter = "",
}: {
  imageUrl?: string | null;
  imageWidth: number;
  imageHeight: number;
  shapes: LayoutShape[];
  statusFilter?: string;
}) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });
  const [moved, setMoved] = useState(false);

  const filtered = useMemo(() => {
    if (!statusFilter) return shapes;
    return shapes.filter((s) => s.status === statusFilter);
  }, [shapes, statusFilter]);

  const aspect = imageWidth / Math.max(imageHeight, 1);

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    setMoved(false);
    setLast({ x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) setMoved(true);
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    setLast({ x: e.clientX, y: e.clientY });
  }

  function onPointerUp() {
    setDragging(false);
  }

  function onPlotActivate(plotId: string) {
    if (moved) return;
    router.push(`/plots/${plotId}`);
  }

  if (!imageUrl && filtered.length === 0) {
    return (
      <div className="m-card flex h-48 items-center justify-center text-[13px] text-muted-foreground">
        No layout map available
      </div>
    );
  }

  return (
    <div className="m-card overflow-hidden">
      <div className="flex items-center justify-end gap-1 border-b border-[var(--border)] px-2 py-1.5">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
          onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
          onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          aria-label="Reset view"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      <div
        className="relative touch-none overflow-hidden bg-[#f4f7f5]"
        style={{ height: 280 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={stageRef}
          data-layout-stage
          className="absolute left-1/2 top-1/2 origin-center"
          style={{
            width: "100%",
            maxWidth: 400,
            aspectRatio: `${aspect}`,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Layout"
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          ) : null}

          <svg viewBox="0 0 1 1" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {filtered.map((s) => {
              const color = PLOT_STATUS_COLORS[s.status]?.hex ?? "#94A3B8";
              const coords = s.coordinates;
              if (!coords?.length) return null;
              const cx =
                s.labelX ?? coords.reduce((a, c) => a + c[0], 0) / coords.length;
              const cy =
                s.labelY ?? coords.reduce((a, c) => a + c[1], 0) / coords.length;
              return (
                <g
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlotActivate(s.plotId);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPlotActivate(s.plotId);
                    }
                  }}
                >
                  <polygon
                    points={coords.map((c) => c.join(",")).join(" ")}
                    fill={`${color}99`}
                    stroke={color}
                    strokeWidth={0.003}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={0.028}
                    fontWeight={700}
                    fill="#122017"
                    className="pointer-events-none select-none"
                  >
                    {s.plotNumber}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
