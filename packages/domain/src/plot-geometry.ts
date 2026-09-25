/**
 * Layout polygon mapping (1:1 sellable geometry).
 * Coordinates normalized to 0–100 master-plan space.
 */

export type NormPoint = [number, number];

export function isMappedPolygon(points: unknown): points is NormPoint[] {
  return Array.isArray(points) && points.length >= 3;
}

export function normalizePoint(pt: unknown): NormPoint | null {
  if (!Array.isArray(pt) || pt.length < 2) return null;
  const x = Number(pt[0]);
  const y = Number(pt[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [clamp01_100(x), clamp01_100(y)];
}

function clamp01_100(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n * 1000) / 1000));
}

export function normalizePolygon(points: unknown): NormPoint[] | null {
  if (!Array.isArray(points) || points.length < 3) return null;
  const out: NormPoint[] = [];
  for (const p of points) {
    const n = normalizePoint(p);
    if (!n) return null;
    out.push(n);
  }
  return out;
}

export function validatePolygon(
  points: unknown,
): { ok: true; points: NormPoint[] } | { ok: false; error: string } {
  const norm = normalizePolygon(points);
  if (!norm) return { ok: false, error: "Polygon needs at least 3 valid vertices in 0–100 space." };
  if (norm.length > 64) return { ok: false, error: "Too many vertices (max 64)." };
  return { ok: true, points: norm };
}

export function plotHasActiveMapping(plot: { polygonJson?: unknown; points?: unknown }): boolean {
  return isMappedPolygon(plot.polygonJson ?? plot.points);
}

/** Enforce one plot ↔ one active sellable polygon. */
export function linkPolygonToPlot(args: {
  plot: { id: string; number: string; polygonJson?: unknown; points?: unknown };
  points: unknown;
  replaceExisting?: boolean;
}): { ok: true; points: NormPoint[] } | { ok: false; error: string } {
  const validated = validatePolygon(args.points);
  if (!validated.ok) return validated;
  if (!args.replaceExisting && plotHasActiveMapping(args.plot)) {
    return {
      ok: false,
      error: `Plot ${args.plot.number} already has an active sellable polygon. Unlink first or use Relink.`,
    };
  }
  return { ok: true, points: validated.points };
}

export function unlinkPolygonFromPlot(): { ok: true; points: NormPoint[] } {
  return { ok: true, points: [] };
}

export function relinkPolygon(args: {
  source: { id: string; number: string; polygonJson?: unknown; points?: unknown };
  target: { id: string; number: string; polygonJson?: unknown; points?: unknown };
}):
  | { ok: true; sourcePoints: NormPoint[]; targetPoints: NormPoint[] }
  | { ok: false; error: string } {
  if (args.source.id === args.target.id) {
    return { ok: false, error: "Source and target plot are the same." };
  }
  if (!plotHasActiveMapping(args.source)) {
    return { ok: false, error: `Plot ${args.source.number} has no active polygon to move.` };
  }
  if (plotHasActiveMapping(args.target)) {
    return {
      ok: false,
      error: `Plot ${args.target.number} already has an active sellable polygon. Unlink it first.`,
    };
  }
  const validated = validatePolygon(args.source.polygonJson ?? args.source.points);
  if (!validated.ok) return validated;
  return { ok: true, sourcePoints: [], targetPoints: validated.points };
}

export function polygonsEqual(a: unknown, b: unknown): boolean {
  const na = normalizePolygon(a);
  const nb = normalizePolygon(b);
  if (!na && !nb) return true;
  if (!na || !nb) return false;
  if (na.length !== nb.length) return false;
  return na.every((p, i) => p[0] === nb[i]![0] && p[1] === nb[i]![1]);
}

export const LAYOUT_VIEWBOX = "0 0 100 100" as const;

export type MasterPlanUploadMeta = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  uploadedAt?: string;
};

export function buildMasterPlanMeta(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number;
  heightPx?: number;
}): MasterPlanUploadMeta {
  return {
    originalName: String(input.originalName || "master-plan").slice(0, 255),
    mimeType: String(input.mimeType || "application/octet-stream").slice(0, 128),
    sizeBytes: Math.max(0, Number(input.sizeBytes) || 0),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Map client pointer → normalized 0–100 when SVG uses
 * viewBox="0 0 100 100" and preserveAspectRatio="xMidYMid meet".
 */
export function clientToNormMeet(args: {
  clientX: number;
  clientY: number;
  rect: { left: number; top: number; width: number; height: number };
  panX?: number;
  panY?: number;
  zoom?: number;
}): NormPoint {
  const zoom = args.zoom && args.zoom > 0 ? args.zoom : 1;
  const panX = args.panX ?? 0;
  const panY = args.panY ?? 0;
  const { width, height, left, top } = args.rect;
  const s = Math.min(width, height) / 100;
  const ox = (width - 100 * s) / 2;
  const oy = (height - 100 * s) / 2;
  const nx = (args.clientX - left - ox) / s / zoom - panX;
  const ny = (args.clientY - top - oy) / s / zoom - panY;
  return [clamp01_100(nx), clamp01_100(ny)];
}
