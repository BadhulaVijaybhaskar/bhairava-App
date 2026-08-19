"use client";

import { useMemo, useState } from "react";
import {
  BLOCK_FACINGS,
  EMPTY_SPEC,
  type BlockPlotSpec,
  totalPlannedFromSpecs,
} from "@/lib/block-plot-specs";
import { generatePlotsForBlock, saveBlockPlotSpecs } from "@/app/admin/projects/block-actions";
import { Plus, Trash2 } from "lucide-react";

function blankRow(): BlockPlotSpec {
  return { ...EMPTY_SPEC };
}

export function BlockPlotSpecsForm({
  projectId,
  blockId,
  initialSpecs,
  existingPlotCount,
}: {
  projectId: string;
  blockId: string;
  initialSpecs: BlockPlotSpec[];
  existingPlotCount: number;
}) {
  const [rows, setRows] = useState<BlockPlotSpec[]>(
    initialSpecs.length > 0 ? initialSpecs : [blankRow()],
  );

  const planned = useMemo(() => totalPlannedFromSpecs(rows), [rows]);
  const remaining = Math.max(planned - existingPlotCount, 0);

  function updateRow(index: number, patch: Partial<BlockPlotSpec>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  return (
    <form action={saveBlockPlotSpecs} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="blockId" value={blockId} />

      <div className="overflow-x-auto rounded-2xl border border-border/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Area (sq.yd)</th>
              <th className="px-3 py-2.5">No. of plots</th>
              <th className="px-3 py-2.5">Facing</th>
              <th className="px-3 py-2.5">Price / sq.yd</th>
              <th className="px-3 py-2.5">Extra charge</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    name="specArea"
                    min={1}
                    step="0.01"
                    required
                    value={row.area}
                    onChange={(e) => updateRow(index, { area: Number(e.target.value) })}
                    className="input-field !pl-3"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    name="specCount"
                    min={1}
                    max={500}
                    required
                    value={row.plotCount}
                    onChange={(e) => updateRow(index, { plotCount: Number(e.target.value) })}
                    className="input-field !pl-3"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    name="specFacing"
                    value={row.facing ?? ""}
                    onChange={(e) =>
                      updateRow(index, {
                        facing: (e.target.value || null) as BlockPlotSpec["facing"],
                      })
                    }
                    className="input-field !pl-3"
                  >
                    <option value="">—</option>
                    {BLOCK_FACINGS.map((f) => (
                      <option key={f} value={f}>
                        {f.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    name="specPrice"
                    min={0}
                    step="1"
                    required
                    value={row.pricePerSqYard}
                    onChange={(e) =>
                      updateRow(index, { pricePerSqYard: Number(e.target.value) })
                    }
                    className="input-field !pl-3"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    name="specExtra"
                    min={0}
                    step="1"
                    value={row.additionalCharges}
                    onChange={(e) =>
                      updateRow(index, { additionalCharges: Number(e.target.value) })
                    }
                    className="input-field !pl-3"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 disabled:opacity-40"
                    aria-label="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, blankRow()])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add size row
        </button>
        <p className="text-sm text-muted-foreground">
          Total planned: <span className="font-semibold text-foreground">{planned}</span>
          {existingPlotCount > 0
            ? ` · ${existingPlotCount} generated · ${remaining} left`
            : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground"
        >
          Save size rows
        </button>
        <button
          type="submit"
          formAction={generatePlotsForBlock}
          disabled={remaining <= 0 && existingPlotCount >= planned && planned > 0}
          className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {existingPlotCount === 0
            ? `Generate ${planned} plots`
            : remaining > 0
              ? `Generate ${remaining} more`
              : "All plots generated"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Example: 200 sq.yd × 10, 300 × 5, 150 × 10 — each with facing, rate, and extra charge.
      </p>
    </form>
  );
}
