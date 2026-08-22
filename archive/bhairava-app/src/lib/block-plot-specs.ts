import type { Facing } from "@prisma/client";

export const BLOCK_FACINGS: Facing[] = [
  "NORTH",
  "SOUTH",
  "EAST",
  "WEST",
  "NORTH_EAST",
  "NORTH_WEST",
  "SOUTH_EAST",
  "SOUTH_WEST",
];

export type BlockPlotSpec = {
  area: number;
  plotCount: number;
  facing: Facing | null;
  pricePerSqYard: number;
  additionalCharges: number;
};

export const EMPTY_SPEC: BlockPlotSpec = {
  area: 200,
  plotCount: 10,
  facing: "EAST",
  pricePerSqYard: 12500,
  additionalCharges: 0,
};

export function parsePlotSpecs(raw: unknown): BlockPlotSpec[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const o = row as Record<string, unknown>;
      const area = Number(o.area);
      const plotCount = Number(o.plotCount);
      const pricePerSqYard = Number(o.pricePerSqYard);
      const additionalCharges = Number(o.additionalCharges ?? 0);
      const facingRaw = o.facing == null || o.facing === "" ? null : String(o.facing);
      const facing =
        facingRaw && BLOCK_FACINGS.includes(facingRaw as Facing)
          ? (facingRaw as Facing)
          : null;
      if (!(area > 0) || !Number.isInteger(plotCount) || plotCount < 1) return null;
      if (!(pricePerSqYard >= 0) || !(additionalCharges >= 0)) return null;
      return { area, plotCount, facing, pricePerSqYard, additionalCharges };
    })
    .filter((x): x is BlockPlotSpec => x != null);
}

export function plotSpecsFromForm(formData: FormData): BlockPlotSpec[] {
  const areas = formData.getAll("specArea").map(String);
  const counts = formData.getAll("specCount").map(String);
  const facings = formData.getAll("specFacing").map(String);
  const prices = formData.getAll("specPrice").map(String);
  const extras = formData.getAll("specExtra").map(String);

  const rows: BlockPlotSpec[] = [];
  for (let i = 0; i < areas.length; i += 1) {
    const area = Number(areas[i]);
    const plotCount = Number(counts[i]);
    const pricePerSqYard = Number(prices[i] || 0);
    const additionalCharges = Number(extras[i] || 0);
    const facingRaw = facings[i] || "";
    const facing = BLOCK_FACINGS.includes(facingRaw as Facing)
      ? (facingRaw as Facing)
      : null;
    if (!(area > 0) || !Number.isInteger(plotCount) || plotCount < 1) continue;
    if (!(pricePerSqYard >= 0) || !(additionalCharges >= 0)) continue;
    rows.push({ area, plotCount, facing, pricePerSqYard, additionalCharges });
  }
  return rows;
}

export function totalPlannedFromSpecs(specs: BlockPlotSpec[]): number {
  return specs.reduce((sum, s) => sum + s.plotCount, 0);
}

export function expandSpecsToPlotData(specs: BlockPlotSpec[]) {
  return specs.flatMap((spec) => {
    const basePrice = spec.area * spec.pricePerSqYard;
    const additionalCharges = spec.additionalCharges;
    const totalPrice = basePrice + additionalCharges;
    return Array.from({ length: spec.plotCount }, () => ({
      area: spec.area,
      areaUnit: "SQ_YARD" as const,
      facing: spec.facing,
      pricePerSqYard: spec.pricePerSqYard,
      basePrice,
      additionalCharges,
      totalPrice,
    }));
  });
}

export function formatFacing(facing: Facing | null | undefined) {
  if (!facing) return "—";
  return facing.replaceAll("_", " ");
}

export function summarizeSpecs(specs: BlockPlotSpec[]): string {
  if (specs.length === 0) return "No size rows yet";
  return specs.map((s) => `${s.area} sq.yd × ${s.plotCount}`).join(" · ");
}
