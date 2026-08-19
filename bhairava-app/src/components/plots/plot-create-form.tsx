"use client";

import { useMemo, useState } from "react";
import { createPlot } from "@/app/admin/plots/actions";

const ERRORS: Record<string, string> = {
  required: "Plot number is required.",
  pricing: "Enter a valid area and price.",
  bulk: "Enter a valid start number and count (1–500).",
  duplicate: "One or more plot numbers already exist in this project.",
};

export function PlotCreateForm({
  projectId,
  projectName,
  error,
}: {
  projectId: string;
  projectName: string;
  error?: string;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [area, setArea] = useState(200);
  const [pricePer, setPricePer] = useState(12500);
  const [extra, setExtra] = useState(0);
  const [prefix, setPrefix] = useState("A-");
  const [startNumber, setStartNumber] = useState(1);
  const [count, setCount] = useState(10);

  const basePrice = useMemo(() => Math.max(area, 0) * Math.max(pricePer, 0), [area, pricePer]);
  const totalPrice = useMemo(() => basePrice + Math.max(extra, 0), [basePrice, extra]);

  return (
    <form action={createPlot} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="basePrice" value={basePrice} />

      {error && ERRORS[error] ? (
        <p className="surface px-4 py-3 text-sm font-medium text-red-600">{ERRORS[error]}</p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Adding plots to <span className="font-semibold text-foreground">{projectName}</span>
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${
            mode === "single" ? "bg-primary text-white" : "border border-border bg-white text-foreground"
          }`}
        >
          Single plot
        </button>
        <button
          type="button"
          onClick={() => setMode("bulk")}
          className={`rounded-xl px-3.5 py-2 text-sm font-semibold ${
            mode === "bulk" ? "bg-primary text-white" : "border border-border bg-white text-foreground"
          }`}
        >
          Bulk create
        </button>
      </div>

      <section className="surface space-y-4 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Identity</h3>
        {mode === "single" ? (
          <label className="block text-sm font-semibold text-foreground">
            Plot number
            <input
              name="plotNumber"
              required={mode === "single"}
              className="input-field mt-1 !pl-3"
              placeholder="A-1"
            />
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-foreground">
              Prefix
              <input
                name="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="input-field mt-1 !pl-3"
                placeholder="A-"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Start no.
              <input
                type="number"
                name="startNumber"
                min={1}
                value={startNumber}
                onChange={(e) => setStartNumber(Number(e.target.value))}
                className="input-field mt-1 !pl-3"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Count
              <input
                type="number"
                name="count"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="input-field mt-1 !pl-3"
              />
            </label>
            <p className="sm:col-span-3 text-xs text-muted-foreground">
              Will create {Math.max(count, 0)} plots: {prefix}
              {startNumber} … {prefix}
              {startNumber + Math.max(count, 1) - 1}
            </p>
          </div>
        )}
        <label className="block text-sm font-semibold text-foreground">
          Block (optional)
          <input name="blockName" className="input-field mt-1 !pl-3" placeholder="Block A" />
        </label>
      </section>

      <section className="surface space-y-4 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Size & price</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-foreground">
            Area
            <input
              type="number"
              name="area"
              min={0.01}
              step="0.01"
              required
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Unit
            <select name="areaUnit" defaultValue="SQ_YARD" className="input-field mt-1 !pl-3">
              <option value="SQ_YARD">Sq. yard</option>
              <option value="SQ_FT">Sq. ft</option>
              <option value="SQ_M">Sq. m</option>
              <option value="CENT">Cent</option>
              <option value="ACRE">Acre</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Price / unit
            <input
              type="number"
              name="pricePerSqYard"
              min={0}
              step="1"
              value={pricePer}
              onChange={(e) => setPricePer(Number(e.target.value))}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Extra charges
            <input
              type="number"
              name="additionalCharges"
              min={0}
              step="1"
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Facing
            <select name="facing" defaultValue="EAST" className="input-field mt-1 !pl-3">
              <option value="">Not set</option>
              <option value="EAST">East</option>
              <option value="WEST">West</option>
              <option value="NORTH">North</option>
              <option value="SOUTH">South</option>
              <option value="NORTH_EAST">North East</option>
              <option value="NORTH_WEST">North West</option>
              <option value="SOUTH_EAST">South East</option>
              <option value="SOUTH_WEST">South West</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Status
            <select name="status" defaultValue="AVAILABLE" className="input-field mt-1 !pl-3">
              <option value="AVAILABLE">Available</option>
              <option value="BLOCKED">Blocked</option>
              <option value="RESERVED">Reserved</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/80 bg-canvas p-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Base price</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              ₹{basePrice.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="mt-1 text-lg font-bold text-primary">₹{totalPrice.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </section>

      <section className="surface space-y-4 p-5">
        <label className="block text-sm font-semibold text-foreground">
          Notes
          <textarea name="notes" rows={2} className="input-field mt-1 !h-auto !pl-3 py-2.5" />
        </label>
      </section>

      <button type="submit" className="btn-primary w-full py-3">
        {mode === "bulk" ? `Create ${Math.max(count, 0)} plots` : "Create plot"}
      </button>
    </form>
  );
}
