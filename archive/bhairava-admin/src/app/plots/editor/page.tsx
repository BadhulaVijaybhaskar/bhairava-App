"use client";
import { useMemo, useState } from "react";
import { MousePointer2, PenTool, Scissors, Ruler, Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlotCanvas, statusFill, statusLabel } from "@/components/plot-canvas";
import { byId, plots as allPlots, type Plot, type PlotStatus } from "@/lib/mock-data";

const plots = allPlots.filter((p) => p.projectId === "PRJ-01");
import { cn } from "@/lib/utils";

type Tool = "select" | "draw" | "split" | "measure";

const TOOLS: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "draw", label: "Draw polygon", icon: PenTool },
  { id: "split", label: "Split", icon: Scissors },
  { id: "measure", label: "Measure", icon: Ruler },
];

const ALL_STATUSES = Object.keys(statusFill) as PlotStatus[];

export default function PlotsEditorPage() {
  const [tool, setTool] = useState<Tool>("select");
  const [hidden, setHidden] = useState<Set<PlotStatus>>(new Set());
  const [fillOpacity, setFillOpacity] = useState(85);
  const [strokeOn, setStrokeOn] = useState(true);
  const [labelsOn, setLabelsOn] = useState(true);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [zoomPct, setZoomPct] = useState(100);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const selected = byId(plots, selectedId);
  const [form, setForm] = useState<{ number: string; area: string; facing: string; price: string }>({
    number: "",
    area: "",
    facing: "",
    price: "",
  });

  const applySelection = (p: Plot) => {
    setSelectedId(p.id);
    setForm({
      number: p.number,
      area: String(p.areaSqYd),
      facing: p.facing,
      price: String(p.pricePerSqYd),
    });
  };

  const toggleStatus = (s: PlotStatus) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const visibleCount = useMemo(
    () => plots.filter((p) => !hidden.has(p.status)).length,
    [hidden],
  );

  return (
    <AppShell bleed>
      <div
        className="flex flex-col gap-3 p-4 pb-24 lg:h-[calc(100vh-4rem)] lg:pb-4"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCursor({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          {/* left tool rail */}
          <aside className="flex w-full shrink-0 flex-row items-center gap-2 overflow-x-auto rounded-2xl bg-surface-low px-3 py-2 lg:w-16 lg:flex-col lg:px-0 lg:py-4">

            {TOOLS.map((t) => (
              <button
                key={t.id}
                title={t.label}
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

          {/* canvas */}
          <div className="h-[48vh] min-w-0 flex-1 lg:h-auto" style={{ opacity: fillOpacity / 100 }}>

            <PlotCanvas
              plots={plots}
              selectedId={selectedId}
              onSelect={applySelection}
              hiddenStatuses={hidden}
              showNumbers={labelsOn}
              className="h-full w-full"
            />
          </div>

          {/* right layer/attributes panel */}
          <aside className="grid w-full shrink-0 gap-3 sm:grid-cols-2 lg:flex lg:w-80 lg:flex-col lg:overflow-y-auto">
            <div className="panel p-4">
              <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Layers
              </p>
              <div className="flex flex-col gap-1.5">
                {ALL_STATUSES.map((s) => (
                  <div
                    key={s}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-low"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: statusFill[s] }} />
                      {statusLabel[s]}
                    </span>
                    <button
                      onClick={() => toggleStatus(s)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {hidden.has(s) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Style
              </p>
              <label className="block pb-1 text-xs text-muted-foreground">
                Fill opacity — {fillOpacity}%
              </label>
              <input
                type="range"
                min={20}
                max={100}
                value={fillOpacity}
                onChange={(e) => setFillOpacity(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <label className="flex items-center justify-between pt-4 text-sm">
                Stroke
                <input
                  type="checkbox"
                  checked={strokeOn}
                  onChange={(e) => setStrokeOn(e.target.checked)}
                  className="accent-primary"
                />
              </label>
              <label className="flex items-center justify-between pt-2 text-sm">
                Labels
                <input
                  type="checkbox"
                  checked={labelsOn}
                  onChange={(e) => setLabelsOn(e.target.checked)}
                  className="accent-primary"
                />
              </label>
            </div>

            <div className="panel-tonal p-4">
              <p className="pb-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Selected polygon
              </p>
              {selected ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Plot number</label>
                    <input
                      value={form.number}
                      onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-surface-low px-2.5 py-1.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Area (sq.yd)</label>
                    <input
                      value={form.area}
                      onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                      className="numeric mt-1 w-full rounded-lg bg-surface-low px-2.5 py-1.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Facing</label>
                    <select
                      value={form.facing}
                      onChange={(e) => setForm((f) => ({ ...f, facing: e.target.value }))}
                      className="mt-1 w-full rounded-lg bg-surface-low px-2.5 py-1.5 text-sm outline-none"
                    >
                      {["East", "West", "North", "South"].map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Price / sq.yd</label>
                    <input
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      className="numeric mt-1 w-full rounded-lg bg-surface-low px-2.5 py-1.5 text-sm outline-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a plot on the canvas to edit attributes.</p>
              )}
            </div>
          </aside>
        </div>

        {/* bottom status bar */}
        <div className="flex items-center justify-between rounded-xl bg-surface-low px-4 py-2 text-xs text-muted-foreground">
          <span>
            Tool: <span className="font-medium text-foreground capitalize">{tool}</span>
          </span>
          <span className="numeric">
            Cursor: {cursor.x}, {cursor.y}
          </span>
          <span className="numeric">Zoom: {zoomPct}%</span>
          <span className="numeric">{visibleCount} plots visible</span>
        </div>
      </div>
    </AppShell>
  );
}
