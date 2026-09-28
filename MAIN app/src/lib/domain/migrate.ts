/**
 * Versioned normalization: legacy mock / localStorage → domain-shaped project records on LOAD.
 * Never discards projects/plots; unknown enums map conservatively.
 *
 * Schema:
 *   v3 (KEY bhairava.admin.v3) — legacy Project.status + lowercase plot status
 *   v4 — adds lifecycleStatus, agentVisible, customerListed, phases, blocks; keeps legacy fields
 */

import {
  enforceVisibilityForLifecycle,
  legacyProjectStatusToLifecycle,
  lifecycleToLegacyStatusLabel,
  type ProjectLifecycle,
} from "./lifecycle";
import { toCanonicalPlotStatus, toLegacyPlotStatus, type CanonicalPlotStatus } from "./plot-status";

export const STORE_SCHEMA_VERSION = 4;

export interface ProjectPhase {
  id: string;
  name: string;
  order: number;
  status: "Planned" | "Active" | "Completed";
  startDate?: string;
  endDate?: string;
}

export interface ProjectBlock {
  id: string;
  name: string;
  phaseId?: string;
  order: number;
}

export interface NormalizedProjectFields {
  lifecycleStatus: ProjectLifecycle;
  agentVisible: boolean;
  customerListed: boolean;
  phases: ProjectPhase[];
  blocks: ProjectBlock[];
  /** Mirrored legacy label for screens still reading project.status */
  status: ReturnType<typeof lifecycleToLegacyStatusLabel>;
}

type Loose = Record<string, unknown>;

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function normalizePhase(raw: unknown, index: number): ProjectPhase {
  const r = (raw && typeof raw === "object" ? raw : {}) as Loose;
  const statusRaw = asString(r["status"]) ?? "Planned";
  const status: ProjectPhase["status"] =
    statusRaw === "Active" || statusRaw === "Completed" ? statusRaw : "Planned";
  const phase: ProjectPhase = {
    id: asString(r["id"]) ?? `PH-${index + 1}`,
    name: asString(r["name"]) ?? `Phase ${index + 1}`,
    order: typeof r["order"] === "number" ? r["order"] : index + 1,
    status,
  };
  const startDate = asString(r["startDate"]);
  const endDate = asString(r["endDate"]);
  if (startDate) phase.startDate = startDate;
  if (endDate) phase.endDate = endDate;
  return phase;
}

export function normalizeBlock(raw: unknown, index: number): ProjectBlock {
  const r = (raw && typeof raw === "object" ? raw : {}) as Loose;
  const block: ProjectBlock = {
    id: asString(r["id"]) ?? `BLK-${index + 1}`,
    name: asString(r["name"]) ?? `Block ${String.fromCharCode(65 + (index % 26))}`,
    order: typeof r["order"] === "number" ? r["order"] : index + 1,
  };
  const phaseId = asString(r["phaseId"]);
  if (phaseId) block.phaseId = phaseId;
  return block;
}

/**
 * Attach / repair lifecycle + visibility on a project-like object.
 * Preserves all other fields. Safe for seed + persisted rows.
 */
export function normalizeProjectRecord<T extends Loose>(project: T): T & NormalizedProjectFields {
  const existingLifecycle = project["lifecycleStatus"];
  const lifecycle: ProjectLifecycle =
    typeof existingLifecycle === "string" &&
    ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"].includes(existingLifecycle)
      ? (existingLifecycle as ProjectLifecycle)
      : legacyProjectStatusToLifecycle(project["status"]);

  const visibility = enforceVisibilityForLifecycle(lifecycle, {
    agentVisible: asBool(project["agentVisible"], false),
    customerListed: asBool(project["customerListed"], false),
  });

  // Prefer Pre-launch→DRAFT mapping; if legacy said Active, keep ACTIVE even without flags
  const phases = asArray(project["phases"]).map((p, i) => normalizePhase(p, i));
  const blocks = asArray(project["blocks"]).map((b, i) => normalizeBlock(b, i));

  // Normalize nested inventory plot statuses to legacy lowercase for PlotStatus compat,
  // while callers that need canonical use toCanonicalPlotStatus at the edge.
  const inventory = asArray(project["inventory"]).map((item) => {
    if (!item || typeof item !== "object") return item;
    const row = item as Loose;
    const canonical = toCanonicalPlotStatus(row["status"]);
    return { ...row, status: toLegacyPlotStatus(canonical) };
  });

  return {
    ...project,
    lifecycleStatus: lifecycle,
    agentVisible: visibility.agentVisible,
    customerListed: visibility.customerListed,
    phases,
    blocks,
    status: lifecycleToLegacyStatusLabel(lifecycle),
    ...(inventory.length ? { inventory } : {}),
  };
}

export function normalizePlotRecord<T extends Loose>(plot: T): T & { status: string; canonicalStatus: CanonicalPlotStatus } {
  const canonical = toCanonicalPlotStatus(plot["status"]);
  return {
    ...plot,
    status: toLegacyPlotStatus(canonical),
    canonicalStatus: canonical,
  };
}

export function normalizeProjects<T extends Loose>(list: T[] | undefined | null): Array<T & NormalizedProjectFields> {
  if (!Array.isArray(list)) return [];
  return list.map((p) => normalizeProjectRecord(p));
}

export function normalizePlots<T extends Loose>(
  list: T[] | undefined | null,
): Array<T & { status: string; canonicalStatus: CanonicalPlotStatus }> {
  if (!Array.isArray(list)) return [];
  return list.map((p) => normalizePlotRecord(p));
}

export interface PersistedEnvelope {
  schemaVersion?: number;
  projects?: Loose[];
  customers?: unknown[];
  agents?: unknown[];
  extraPlots?: Loose[];
  extraBookings?: unknown[];
  extraReservations?: unknown[];
  extraVisits?: unknown[];
}

/**
 * Read + migrate persisted JSON. Never drops arrays; normalizes project/plot enums.
 */
export function migratePersisted(raw: unknown): PersistedEnvelope & { schemaVersion: number } {
  const data = (raw && typeof raw === "object" ? raw : {}) as PersistedEnvelope;
  const version = typeof data.schemaVersion === "number" ? data.schemaVersion : 3;

  const projects = normalizeProjects(data.projects);
  const extraPlots = normalizePlots(data.extraPlots);

  return {
    ...data,
    schemaVersion: Math.max(version, STORE_SCHEMA_VERSION),
    projects,
    extraPlots,
  };
}
