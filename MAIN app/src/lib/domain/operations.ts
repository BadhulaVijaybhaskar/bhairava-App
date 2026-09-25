/**
 * P5 Operations domain — Documents vault, Registration pipeline, Resale listings.
 * Visibility SoT: INTERNAL | AGENT_VISIBLE | CUSTOMER_PROFILE_RELATED.
 * Customer never browses project vault in MAIN. No invented metrics.
 * Registration completion / resale listing drive plot via canonical transition layer.
 */
import type { Booking, DocumentRecord, Plot, Registration } from "@/lib/mock-data";
import { normalizeRole } from "./project-permissions";
import {
  applyStatusTransition,
  type PlotStatusHistoryEntry,
} from "./plot-transitions";
import {
  toCanonicalPlotStatus,
  toLegacyPlotStatus,
  type CanonicalPlotStatus,
} from "./plot-status";

export type DocumentVisibility = "INTERNAL" | "AGENT_VISIBLE" | "CUSTOMER_PROFILE_RELATED";

export type OperationsAccess = "full" | "operate" | "agent" | "read" | "denied";

export function operationsAccessForRole(role: unknown): OperationsAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance") return "operate";
  if (r === "Agent" || r === "Sales") return "agent";
  if (r === "Viewer") return "read";
  return "denied";
}

export function canViewOperations(role: unknown): boolean {
  return operationsAccessForRole(role) !== "denied";
}

export function canMutateOperations(role: unknown): boolean {
  const a = operationsAccessForRole(role);
  return a === "full" || a === "operate";
}

export const DOCUMENT_VISIBILITY_LABEL: Record<DocumentVisibility, string> = {
  INTERNAL: "Internal",
  AGENT_VISIBLE: "Agent visible",
  CUSTOMER_PROFILE_RELATED: "Customer profile–related",
};

export type DocumentVerifyStatus = DocumentRecord["verified"];

export interface DocumentVersion {
  version: number;
  name: string;
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  docType: DocumentRecord["type"] | "Master layout" | "Other";
  visibility: DocumentVisibility;
  /** Required when CUSTOMER_PROFILE_RELATED */
  customerId?: string;
  bookingId?: string;
  plotId?: string;
  verified: DocumentVerifyStatus;
  modified: string;
  sizeKb: number;
  uploadedBy: string;
  notes?: string;
  /** Soft-archive — never hard-delete */
  archived?: boolean;
  versions?: DocumentVersion[];
  currentVersion?: number;
}

/** Locked registration pipeline statuses (P5 completion). */
export type RegistrationStage =
  | "NOT_STARTED"
  | "DOCUMENTS_PENDING"
  | "READY"
  | "SCHEDULED"
  | "COMPLETED"
  | "ON_HOLD";

export const REGISTRATION_STAGES: RegistrationStage[] = [
  "NOT_STARTED",
  "DOCUMENTS_PENDING",
  "READY",
  "SCHEDULED",
  "COMPLETED",
  "ON_HOLD",
];

export const REGISTRATION_STAGE_LABEL: Record<RegistrationStage, string> = {
  NOT_STARTED: "Not started",
  DOCUMENTS_PENDING: "Documents pending",
  READY: "Ready",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
};

/** Doc types that must exist + be Verified before schedule/complete. */
export const REQUIRED_REGISTRATION_DOC_TYPES: Array<ProjectDocument["docType"]> = [
  "KYC",
  "Agreement",
  "Sale deed",
];

export interface RegistrationCase {
  id: string;
  projectId: string;
  bookingId: string;
  customerId: string;
  plotId: string;
  stage: RegistrationStage;
  /** Responsible staff */
  responsibleStaff: string;
  /** Registrar office / sub-registrar */
  registrarOffice: string;
  scheduledAt?: string;
  requiredDocTypes: Array<ProjectDocument["docType"]>;
  notes?: string;
  completedAt?: string;
  registrationReference?: string;
  /** Legacy display aliases */
  slot?: string;
  subRegistrar?: string;
}

export type ResaleApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ResaleListingStatus = "ACTIVE" | "UNDER_OFFER" | "WITHDRAWN" | "TRANSFERRED";

/** Legacy UI stages — mapped to ResaleListingStatus */
export type ResaleStage = "Listed" | "Under offer" | "Transferred" | "Withdrawn";

export interface ResaleCase {
  id: string;
  listingId: string;
  projectId: string;
  plotId: string;
  ownerCustomerId: string;
  /** Prior booking / seller link — never overwritten by resale booking */
  originalBookingId?: string;
  bookingId?: string;
  sellerCustomerId?: string;
  askingPrice: number;
  askPrice: number;
  approvedPrice?: number;
  listedAt: string;
  approvalStatus: ResaleApprovalStatus;
  status: ResaleListingStatus;
  stage: ResaleStage;
  assignedAgentId?: string;
  notes?: string;
  /** New-buyer booking referencing this listing */
  resaleBookingId?: string;
}

export const RESALE_STAGE_LABEL: Record<ResaleStage, string> = {
  Listed: "Listed",
  "Under offer": "Under offer",
  Transferred: "Transferred",
  Withdrawn: "Withdrawn",
};

export const RESALE_STATUS_LABEL: Record<ResaleListingStatus, string> = {
  ACTIVE: "Active",
  UNDER_OFFER: "Under offer",
  WITHDRAWN: "Withdrawn",
  TRANSFERRED: "Transferred",
};

/* ---------- visibility / filters ---------- */

export function canSeeDocumentVisibility(
  visibility: DocumentVisibility,
  role: unknown,
  opts?: { agentAssignedCustomerIds?: string[]; financeDocTypes?: boolean },
): boolean {
  const access = operationsAccessForRole(role);
  if (access === "denied") return false;
  if (access === "full" || access === "read") return true;
  if (access === "operate") {
    if (visibility === "INTERNAL") return opts?.financeDocTypes !== false;
    return true;
  }
  if (visibility === "INTERNAL") return false;
  if (visibility === "AGENT_VISIBLE") return true;
  if (visibility === "CUSTOMER_PROFILE_RELATED") return true;
  return false;
}

export function filterDocumentsForRole(
  docs: ProjectDocument[],
  opts: {
    projectId: string;
    role: unknown;
    agentAssignedCustomerIds?: string[];
    includeArchived?: boolean;
  },
): ProjectDocument[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  let list = docs.filter((d) => d.projectId === opts.projectId);
  if (!opts.includeArchived) list = list.filter((d) => !d.archived);
  list = list.filter((d) =>
    canSeeDocumentVisibility(d.visibility, opts.role, {
      financeDocTypes:
        d.docType === "Receipt" || d.docType === "Agreement" || d.docType === "Sale deed",
    }),
  );
  if (access === "agent" && opts.agentAssignedCustomerIds) {
    const allowed = new Set(opts.agentAssignedCustomerIds);
    list = list.filter((d) => {
      if (d.visibility === "AGENT_VISIBLE") return true;
      if (d.visibility === "CUSTOMER_PROFILE_RELATED") {
        return !!d.customerId && allowed.has(d.customerId);
      }
      return false;
    });
  }
  return list;
}

export function filterRegistrationsForRole(
  rows: RegistrationCase[],
  bookings: Booking[],
  opts: { projectId: string; role: unknown; agentId?: string | null },
): RegistrationCase[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  let list = rows.filter((r) => r.projectId === opts.projectId);
  if (access === "agent" && opts.agentId) {
    const mine = new Set(
      bookings
        .filter((b) => b.projectId === opts.projectId && b.agentId === opts.agentId)
        .map((b) => b.id),
    );
    list = list.filter((r) => mine.has(r.bookingId));
  }
  return list;
}

export function filterResalesForRole(
  rows: ResaleCase[],
  opts: { projectId: string; role: unknown },
): ResaleCase[] {
  const access = operationsAccessForRole(opts.role);
  if (access === "denied") return [];
  return rows.filter((r) => r.projectId === opts.projectId);
}

/* ---------- documents ---------- */

function ensureVersions(doc: ProjectDocument): DocumentVersion[] {
  if (Array.isArray(doc.versions) && doc.versions.length > 0) return doc.versions;
  return [
    {
      version: 1,
      name: doc.name,
      sizeKb: doc.sizeKb,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.modified,
      ...(doc.notes ? { notes: doc.notes } : {}),
    },
  ];
}

export function normalizeProjectDocument(
  raw: Partial<ProjectDocument> & { id: string; projectId: string },
): ProjectDocument {
  const uploadedBy = raw.uploadedBy ?? "system@seed";
  const modified = raw.modified ?? new Date().toISOString().slice(0, 10);
  const name = raw.name ?? "document.pdf";
  const sizeKb = raw.sizeKb ?? 100;
  const base: ProjectDocument = {
    id: raw.id,
    projectId: raw.projectId,
    name,
    docType: (raw.docType as ProjectDocument["docType"]) ?? "Other",
    visibility: raw.visibility ?? "INTERNAL",
    verified: raw.verified ?? "Pending",
    modified,
    sizeKb,
    uploadedBy,
  };
  if (raw.customerId) base.customerId = raw.customerId;
  if (raw.bookingId) base.bookingId = raw.bookingId;
  if (raw.plotId) base.plotId = raw.plotId;
  if (raw.notes) base.notes = raw.notes;
  if (raw.archived) base.archived = true;
  const versions = ensureVersions({
    ...base,
    ...(raw.versions ? { versions: raw.versions } : {}),
    ...(raw.currentVersion != null ? { currentVersion: raw.currentVersion } : {}),
  });
  base.versions = versions;
  base.currentVersion = raw.currentVersion ?? versions[versions.length - 1]!.version;
  return base;
}

export function legacyDocumentToProject(
  d: DocumentRecord,
  uploadedBy = "system@seed",
): ProjectDocument {
  const visibility: DocumentVisibility =
    d.type === "Layout approval" || d.type === "NOC"
      ? "INTERNAL"
      : d.type === "Receipt" || d.type === "KYC"
        ? "CUSTOMER_PROFILE_RELATED"
        : "AGENT_VISIBLE";
  return normalizeProjectDocument({
    id: d.id,
    projectId: d.projectId,
    name: d.name,
    docType: d.type,
    visibility,
    customerId: d.customerId,
    plotId: d.plotId,
    verified: d.verified,
    modified: d.modified,
    sizeKb: d.sizeKb,
    uploadedBy,
  });
}

export function replaceDocumentVersion(
  doc: ProjectDocument,
  opts: { name: string; sizeKb: number; uploadedBy: string; notes?: string },
): ProjectDocument {
  const versions = ensureVersions(doc);
  const nextVer = (doc.currentVersion ?? versions.length) + 1;
  const uploadedAt = new Date().toISOString();
  const version: DocumentVersion = {
    version: nextVer,
    name: opts.name,
    sizeKb: opts.sizeKb,
    uploadedBy: opts.uploadedBy,
    uploadedAt,
    ...(opts.notes ? { notes: opts.notes } : {}),
  };
  return normalizeProjectDocument({
    ...doc,
    name: opts.name,
    sizeKb: opts.sizeKb,
    uploadedBy: opts.uploadedBy,
    modified: uploadedAt.slice(0, 10),
    verified: "Pending",
    versions: [...versions, version],
    currentVersion: nextVer,
    ...(opts.notes ? { notes: opts.notes } : {}),
  });
}

export function archiveDocument(doc: ProjectDocument): ProjectDocument {
  return normalizeProjectDocument({
    ...doc,
    archived: true,
    modified: new Date().toISOString().slice(0, 10),
  });
}

export function setDocumentVerification(
  doc: ProjectDocument,
  verified: DocumentVerifyStatus,
): ProjectDocument {
  return normalizeProjectDocument({
    ...doc,
    verified,
    modified: new Date().toISOString().slice(0, 10),
  });
}

/* ---------- registration ---------- */

export function mapLegacyRegistrationStage(raw: unknown): RegistrationStage {
  if (typeof raw !== "string") return "NOT_STARTED";
  const s = raw.trim();
  if ((REGISTRATION_STAGES as string[]).includes(s)) return s as RegistrationStage;
  const key = s.toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, RegistrationStage> = {
    documentation: "DOCUMENTS_PENDING",
    documents_pending: "DOCUMENTS_PENDING",
    not_started: "NOT_STARTED",
    ready: "READY",
    scheduled: "SCHEDULED",
    completed: "COMPLETED",
    on_hold: "ON_HOLD",
    hold: "ON_HOLD",
  };
  return map[key] ?? "DOCUMENTS_PENDING";
}

export function legacyRegistrationToCase(
  r: Registration,
  projectId: string,
): RegistrationCase {
  const stage = mapLegacyRegistrationStage(r.stage);
  const row: RegistrationCase = {
    id: r.id,
    projectId,
    bookingId: r.bookingId,
    customerId: r.customerId,
    plotId: r.plotId,
    stage,
    responsibleStaff: "admin@bhairava.com",
    registrarOffice: r.subRegistrar,
    requiredDocTypes: [...REQUIRED_REGISTRATION_DOC_TYPES],
    slot: r.slot,
    subRegistrar: r.subRegistrar,
  };
  if (r.slot) row.scheduledAt = r.slot;
  if (stage === "COMPLETED") {
    row.completedAt = (r.slot || "2026-09-01").slice(0, 10);
    row.registrationReference = `RR-${r.id}`;
  }
  return row;
}

export function normalizeRegistrationCase(
  raw: Partial<RegistrationCase> & { id: string; projectId: string },
): RegistrationCase {
  const stage = mapLegacyRegistrationStage(raw.stage);
  const row: RegistrationCase = {
    id: raw.id,
    projectId: raw.projectId,
    bookingId: raw.bookingId ?? "",
    customerId: raw.customerId ?? "",
    plotId: raw.plotId ?? "",
    stage,
    responsibleStaff: raw.responsibleStaff ?? "admin@bhairava.com",
    registrarOffice: raw.registrarOffice ?? raw.subRegistrar ?? "Shamshabad",
    requiredDocTypes: raw.requiredDocTypes?.length
      ? raw.requiredDocTypes
      : [...REQUIRED_REGISTRATION_DOC_TYPES],
  };
  if (raw.scheduledAt) row.scheduledAt = raw.scheduledAt;
  else if (raw.slot) row.scheduledAt = raw.slot;
  if (raw.notes) row.notes = raw.notes;
  if (raw.completedAt) row.completedAt = raw.completedAt;
  if (raw.registrationReference) row.registrationReference = raw.registrationReference;
  if (raw.slot) row.slot = raw.slot;
  if (raw.subRegistrar) row.subRegistrar = raw.subRegistrar;
  return row;
}

export function missingRequiredDocs(
  reg: RegistrationCase,
  docs: ProjectDocument[],
): {
  missingTypes: Array<ProjectDocument["docType"]>;
  unverifiedTypes: Array<ProjectDocument["docType"]>;
} {
  const linked = docs.filter(
    (d) =>
      !d.archived &&
      d.projectId === reg.projectId &&
      (d.bookingId === reg.bookingId ||
        d.customerId === reg.customerId ||
        d.plotId === reg.plotId),
  );
  const required = reg.requiredDocTypes?.length
    ? reg.requiredDocTypes
    : REQUIRED_REGISTRATION_DOC_TYPES;
  const missingTypes: Array<ProjectDocument["docType"]> = [];
  const unverifiedTypes: Array<ProjectDocument["docType"]> = [];
  for (const t of required) {
    const hits = linked.filter((d) => d.docType === t);
    if (hits.length === 0) missingTypes.push(t);
    else if (!hits.some((d) => d.verified === "Verified")) unverifiedTypes.push(t);
  }
  return { missingTypes, unverifiedTypes };
}

export function registrationDocsBlocker(
  reg: RegistrationCase,
  docs: ProjectDocument[],
): string | null {
  const { missingTypes, unverifiedTypes } = missingRequiredDocs(reg, docs);
  if (missingTypes.length) return `Missing required docs: ${missingTypes.join(", ")}`;
  if (unverifiedTypes.length)
    return `Unverified required docs: ${unverifiedTypes.join(", ")}`;
  return null;
}

export function canScheduleRegistration(
  reg: RegistrationCase,
  docs: ProjectDocument[],
): { ok: true } | { ok: false; error: string } {
  if (reg.stage === "COMPLETED") return { ok: false, error: "Already completed." };
  if (reg.stage === "SCHEDULED") return { ok: false, error: "Already scheduled." };
  const blocker = registrationDocsBlocker(reg, docs);
  if (blocker) return { ok: false, error: blocker };
  return { ok: true };
}

export function canCompleteRegistration(
  reg: RegistrationCase,
  docs: ProjectDocument[],
): { ok: true } | { ok: false; error: string } {
  if (reg.stage === "COMPLETED") return { ok: false, error: "Already completed." };
  if (reg.stage !== "SCHEDULED" && reg.stage !== "READY") {
    return {
      ok: false,
      error: `Complete requires SCHEDULED or READY (got ${reg.stage}).`,
    };
  }
  const blocker = registrationDocsBlocker(reg, docs);
  if (blocker) return { ok: false, error: blocker };
  return { ok: true };
}

function applyPlotTransitionChain(
  plot: Plot,
  targets: CanonicalPlotStatus[],
  actorId: string,
  reason: string,
):
  | { ok: true; plot: Plot; entries: PlotStatusHistoryEntry[] }
  | { ok: false; error: string } {
  let current: Plot = { ...plot };
  const history: PlotStatusHistoryEntry[] = [
    ...((current.statusHistory ?? []) as PlotStatusHistoryEntry[]),
  ];
  let from = toCanonicalPlotStatus(current.canonicalStatus ?? current.status);
  for (const to of targets) {
    if (from === to) continue;
    const tr = applyStatusTransition({
      from,
      to,
      reason,
      actorId,
      source: "SYSTEM",
    });
    if (!tr.ok) return { ok: false, error: tr.error };
    history.push(tr.entry);
    from = tr.to;
    current = {
      ...current,
      status: toLegacyPlotStatus(tr.to) as Plot["status"],
      canonicalStatus: tr.to,
      statusHistory: history,
    };
  }
  return { ok: true, plot: current, entries: history };
}

/** BOOKED → UNDER_DOCUMENTATION when docs pipeline starts. */
export function advancePlotToUnderDocumentation(
  plot: Plot,
  actorId: string,
  reason = "Registration documentation started",
): { ok: true; plot: Plot } | { ok: false; error: string } {
  const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
  if (
    from === "UNDER_DOCUMENTATION" ||
    from === "SOLD" ||
    from === "REGISTERED" ||
    from === "RESALE_AVAILABLE"
  ) {
    return { ok: true, plot };
  }
  if (from !== "BOOKED") {
    return {
      ok: false,
      error: `Cannot move to UNDER_DOCUMENTATION from ${from}.`,
    };
  }
  const r = applyPlotTransitionChain(plot, ["UNDER_DOCUMENTATION"], actorId, reason);
  if (!r.ok) return r;
  return { ok: true, plot: r.plot };
}

/**
 * On registration complete: drive plot to REGISTERED via allow-list
 * UNDER_DOCUMENTATION → SOLD → REGISTERED (or SOLD → REGISTERED).
 */
export function completeRegistrationOnPlot(
  plot: Plot,
  actorId: string,
  reason = "Registration completed",
):
  | { ok: true; plot: Plot; entries: PlotStatusHistoryEntry[] }
  | { ok: false; error: string } {
  const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
  if (from === "REGISTERED") {
    return { ok: true, plot, entries: [] };
  }
  const targets: CanonicalPlotStatus[] = [];
  if (from === "BOOKED") {
    targets.push("UNDER_DOCUMENTATION", "SOLD", "REGISTERED");
  } else if (from === "UNDER_DOCUMENTATION") {
    targets.push("SOLD", "REGISTERED");
  } else if (from === "SOLD") {
    targets.push("REGISTERED");
  } else {
    return {
      ok: false,
      error: `Cannot complete registration from plot status ${from}.`,
    };
  }
  return applyPlotTransitionChain(plot, targets, actorId, reason);
}

export function applyScheduleRegistration(
  reg: RegistrationCase,
  docs: ProjectDocument[],
  opts: { scheduledAt: string; registrarOffice?: string },
): { ok: true; registration: RegistrationCase } | { ok: false; error: string } {
  const gate = canScheduleRegistration(reg, docs);
  if (!gate.ok) return gate;
  if (!opts.scheduledAt.trim()) return { ok: false, error: "Scheduled datetime required." };
  const registration = normalizeRegistrationCase({
    ...reg,
    stage: "SCHEDULED",
    scheduledAt: opts.scheduledAt.trim(),
    slot: opts.scheduledAt.trim(),
    registrarOffice: opts.registrarOffice?.trim() || reg.registrarOffice,
    subRegistrar: opts.registrarOffice?.trim() || reg.subRegistrar || reg.registrarOffice,
  });
  return { ok: true, registration };
}

export function applyCompleteRegistration(
  reg: RegistrationCase,
  docs: ProjectDocument[],
  plot: Plot,
  opts: { actorId: string; registrationReference?: string; completedAt?: string },
):
  | { ok: true; registration: RegistrationCase; plot: Plot }
  | { ok: false; error: string } {
  const gate = canCompleteRegistration(reg, docs);
  if (!gate.ok) return gate;
  const plotResult = completeRegistrationOnPlot(
    plot,
    opts.actorId,
    `Registration ${reg.id} completed`,
  );
  if (!plotResult.ok) return plotResult;
  const completedAt = opts.completedAt ?? new Date().toISOString().slice(0, 10);
  const registration = normalizeRegistrationCase({
    ...reg,
    stage: "COMPLETED",
    completedAt,
    registrationReference:
      opts.registrationReference?.trim() ||
      reg.registrationReference ||
      `RR-${reg.id}`,
  });
  return { ok: true, registration, plot: plotResult.plot };
}

/* ---------- resale ---------- */

function statusToStage(status: ResaleListingStatus): ResaleStage {
  if (status === "UNDER_OFFER") return "Under offer";
  if (status === "TRANSFERRED") return "Transferred";
  if (status === "WITHDRAWN") return "Withdrawn";
  return "Listed";
}

function stageToStatus(stage: ResaleStage | string): ResaleListingStatus {
  if (stage === "Under offer" || stage === "UNDER_OFFER") return "UNDER_OFFER";
  if (stage === "Transferred" || stage === "TRANSFERRED") return "TRANSFERRED";
  if (stage === "Withdrawn" || stage === "WITHDRAWN") return "WITHDRAWN";
  return "ACTIVE";
}

export function normalizeResaleCase(
  raw: Partial<ResaleCase> & { id?: string; listingId?: string; projectId: string },
): ResaleCase {
  const listingId = raw.listingId ?? raw.id ?? `RSL-${raw.plotId ?? "X"}`;
  const status = raw.status ?? stageToStatus(raw.stage ?? "Listed");
  const stage = raw.stage ?? statusToStage(status);
  const askingPrice = raw.askingPrice ?? raw.askPrice ?? 0;
  const owner =
    raw.ownerCustomerId ?? raw.sellerCustomerId ?? "";
  const row: ResaleCase = {
    id: listingId,
    listingId,
    projectId: raw.projectId,
    plotId: raw.plotId ?? "",
    ownerCustomerId: owner,
    askingPrice,
    askPrice: askingPrice,
    listedAt: raw.listedAt ?? new Date().toISOString().slice(0, 10),
    approvalStatus: raw.approvalStatus ?? "APPROVED",
    status,
    stage,
  };
  if (raw.originalBookingId) row.originalBookingId = raw.originalBookingId;
  else if (raw.bookingId) row.originalBookingId = raw.bookingId;
  if (raw.bookingId) row.bookingId = raw.bookingId;
  if (raw.sellerCustomerId) row.sellerCustomerId = raw.sellerCustomerId;
  if (raw.approvedPrice != null) row.approvedPrice = raw.approvedPrice;
  if (raw.assignedAgentId) row.assignedAgentId = raw.assignedAgentId;
  if (raw.notes) row.notes = raw.notes;
  if (raw.resaleBookingId) row.resaleBookingId = raw.resaleBookingId;
  return row;
}

export function createResaleListing(
  plot: Plot,
  opts: {
    listingId: string;
    askingPrice: number;
    actorId: string;
    ownerCustomerId?: string;
    originalBookingId?: string;
    assignedAgentId?: string;
    notes?: string;
    approvedPrice?: number;
    approvalStatus?: ResaleApprovalStatus;
  },
):
  | { ok: true; listing: ResaleCase; plot: Plot }
  | { ok: false; error: string } {
  const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
  if (from !== "SOLD" && from !== "REGISTERED") {
    return {
      ok: false,
      error: `Resale only from SOLD or REGISTERED (got ${from}).`,
    };
  }
  const owner = opts.ownerCustomerId || plot.customerId || "";
  if (!owner) return { ok: false, error: "Owner customer required for resale listing." };
  if (!(opts.askingPrice > 0)) return { ok: false, error: "Asking price must be positive." };

  const plotResult = applyPlotTransitionChain(
    plot,
    ["RESALE_AVAILABLE"],
    opts.actorId,
    `Resale listing ${opts.listingId}`,
  );
  if (!plotResult.ok) return plotResult;

  const listing = normalizeResaleCase({
    listingId: opts.listingId,
    projectId: plot.projectId,
    plotId: plot.id,
    ownerCustomerId: owner,
    sellerCustomerId: owner,
    askingPrice: opts.askingPrice,
    listedAt: new Date().toISOString().slice(0, 10),
    approvalStatus: opts.approvalStatus ?? "PENDING",
    status: "ACTIVE",
    stage: "Listed",
    ...(opts.originalBookingId ? { originalBookingId: opts.originalBookingId, bookingId: opts.originalBookingId } : {}),
    ...(opts.assignedAgentId ? { assignedAgentId: opts.assignedAgentId } : {}),
    ...(opts.notes ? { notes: opts.notes } : {}),
    ...(opts.approvedPrice != null ? { approvedPrice: opts.approvedPrice } : {}),
  });

  return { ok: true, listing, plot: plotResult.plot };
}

export function linkResaleBooking(listing: ResaleCase, bookingId: string): ResaleCase {
  return normalizeResaleCase({
    ...listing,
    resaleBookingId: bookingId,
    status: listing.status === "ACTIVE" ? "UNDER_OFFER" : listing.status,
    stage: listing.status === "ACTIVE" ? "Under offer" : listing.stage,
  });
}

export function resaleCasesFromPlots(plots: Plot[], projectId: string): ResaleCase[] {
  return plots
    .filter(
      (p) =>
        p.projectId === projectId &&
        (p.status === "resale" ||
          toCanonicalPlotStatus(p.canonicalStatus ?? p.status) === "RESALE_AVAILABLE"),
    )
    .map((p, i) => {
      const status = (["ACTIVE", "UNDER_OFFER", "ACTIVE", "TRANSFERRED"] as ResaleListingStatus[])[
        i % 4
      ]!;
      const base: Parameters<typeof normalizeResaleCase>[0] = {
        listingId: `RSL-${p.id}`,
        projectId,
        plotId: p.id,
        ownerCustomerId: p.customerId ?? "",
        askingPrice: Math.round((p.areaSqYd || 200) * (p.pricePerSqYd || 25000)),
        listedAt: `2026-08-${String((i % 27) + 1).padStart(2, "0")}`,
        approvalStatus: "APPROVED",
        status,
        notes: "Derived from plot resale status — not an invented listing count.",
      };
      if (p.customerId) {
        base.sellerCustomerId = p.customerId;
        base.ownerCustomerId = p.customerId;
      }
      return normalizeResaleCase(base);
    });
}

export interface OpsDashboardCounts {
  documentsPending: number;
  documentsVerified: number;
  registrationsPending: number;
  registrationsScheduled: number;
  registrationsCompleted: number;
  resaleListingsActive: number;
}

export function deriveOpsDashboard(input: {
  documents: ProjectDocument[];
  registrations: RegistrationCase[];
  resales: ResaleCase[];
  projectId: string;
  role: unknown;
  agentAssignedCustomerIds?: string[];
  bookings?: Booking[];
  agentId?: string | null;
}): OpsDashboardCounts {
  const docs = filterDocumentsForRole(input.documents, {
    projectId: input.projectId,
    role: input.role,
    ...(input.agentAssignedCustomerIds
      ? { agentAssignedCustomerIds: input.agentAssignedCustomerIds }
      : {}),
  });
  const regs = filterRegistrationsForRole(input.registrations, input.bookings ?? [], {
    projectId: input.projectId,
    role: input.role,
    ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
  });
  const resales = filterResalesForRole(input.resales, {
    projectId: input.projectId,
    role: input.role,
  });
  return {
    documentsPending: docs.filter((d) => d.verified === "Pending").length,
    documentsVerified: docs.filter((d) => d.verified === "Verified").length,
    registrationsPending: regs.filter(
      (r) =>
        r.stage === "NOT_STARTED" ||
        r.stage === "DOCUMENTS_PENDING" ||
        r.stage === "READY" ||
        r.stage === "ON_HOLD",
    ).length,
    registrationsScheduled: regs.filter((r) => r.stage === "SCHEDULED").length,
    registrationsCompleted: regs.filter((r) => r.stage === "COMPLETED").length,
    resaleListingsActive: resales.filter(
      (r) => r.status === "ACTIVE" || r.status === "UNDER_OFFER",
    ).length,
  };
}


