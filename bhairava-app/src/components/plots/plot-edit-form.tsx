"use client";

import { deletePlot, updatePlot } from "@/app/admin/plots/actions";
import { PLOT_STATUS_COLORS } from "@/lib/constants";

export function PlotEditForm({
  plot,
  error,
  saved,
}: {
  plot: {
    id: string;
    plotNumber: string;
    area: number;
    areaUnit: string;
    facing: string | null;
    pricePerSqYard: number | null;
    basePrice: number;
    additionalCharges: number;
    totalPrice: number;
    status: string;
    notes: string | null;
    blockName: string | null;
  };
  error?: string;
  saved?: boolean;
}) {
  const errors: Record<string, string> = {
    pricing: "Enter a valid area and price.",
    duplicate: "Another plot already uses this number.",
    booked: "Cannot delete — plot has an active booking. Cancel the booking first.",
  };

  return (
    <div className="space-y-4">
      {error && errors[error] ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errors[error]}</p>
      ) : null}
      {saved ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Plot saved.
        </p>
      ) : null}

      <form action={updatePlot} className="surface space-y-4 p-5">
        <input type="hidden" name="id" value={plot.id} />
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Edit plot</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-foreground">
            Plot number
            <input
              name="plotNumber"
              required
              defaultValue={plot.plotNumber}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Block
            <input
              name="blockName"
              defaultValue={plot.blockName ?? ""}
              className="input-field mt-1 !pl-3"
              placeholder="Optional"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Area
            <input
              type="number"
              name="area"
              min={0.01}
              step="0.01"
              required
              defaultValue={plot.area}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Unit
            <select name="areaUnit" defaultValue={plot.areaUnit} className="input-field mt-1 !pl-3">
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
              defaultValue={plot.pricePerSqYard ?? 0}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Base price
            <input
              type="number"
              name="basePrice"
              min={0}
              step="1"
              defaultValue={plot.basePrice}
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
              defaultValue={plot.additionalCharges}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Facing
            <select name="facing" defaultValue={plot.facing ?? ""} className="input-field mt-1 !pl-3">
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
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Status
            <select name="status" defaultValue={plot.status} className="input-field mt-1 !pl-3">
              {Object.entries(PLOT_STATUS_COLORS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Notes
            <textarea
              name="notes"
              rows={2}
              defaultValue={plot.notes ?? ""}
              className="input-field mt-1 !h-auto !pl-3 py-2.5"
            />
          </label>
        </div>

        <button type="submit" className="btn-primary w-full py-3">
          Save changes
        </button>
      </form>

      <form
        action={deletePlot}
        className="surface p-5"
        onSubmit={(e) => {
          if (!confirm("Delete this plot? This cannot be undone easily.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={plot.id} />
        <p className="text-sm text-muted-foreground">Remove plot from inventory (soft delete).</p>
        <button
          type="submit"
          className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Delete plot
        </button>
      </form>
    </div>
  );
}
