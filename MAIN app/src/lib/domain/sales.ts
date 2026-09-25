/**
 * P3 Sales domain: Lead entity, conversion, reservation expiry, atomic booking,
 * cancellation workflow, sales dashboard (derived), role/PII projections.
 * Plot status moves only via SALES_FLOW allow-list (no HOLD).
 */
import type {
  Booking,
  Customer,
  Lead,
  LeadStage,
  LeadStageHistoryEntry,
  Plot,
  Reservation,
  SiteVisit,
} from "@/lib/mock-data";
import { applyStatusTransition, type PlotStatusHistoryEntry } from "./plot-transitions";
import { toCanonicalPlotStatus, toLegacyPlotStatus } from "./plot-status";
import { normalizeRole, salesAccessForRole } from "./project-permissions";

export type { Lead, LeadStage, LeadStageHistoryEntry };

export const LEAD_STAGES: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT_PLANNED",
  "SITE_VISIT_COMPLETED",
  "INTERESTED",
  "NEGOTIATION",
  "RESERVED",
  "BOOKED",
  "LOST",
];

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  SITE_VISIT_PLANNED: "Site visit planned",
  SITE_VISIT_COMPLETED: "Site visit completed",
  INTERESTED: "Interested",
  NEGOTIATION: "Negotiation",
  RESERVED: "Reserved",
  BOOKED: "Booked",
  LOST: "Lost",
};

export const SITE_VISIT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type CanonicalSiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

export function toCanonicalSiteVisitStatus(raw: unknown): CanonicalSiteVisitStatus {
  if (typeof raw !== "string") return "SCHEDULED";
  const k = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (k === "COMPLETED") return "COMPLETED";
  if (k === "CANCELLED" || k === "CANCELED") return "CANCELLED";
  if (k === "NO_SHOW" || k === "NOSHOW") return "NO_SHOW";
  if (k === "CONFIRMED" || k === "RESCHEDULED" || k === "SCHEDULED") return "SCHEDULED";
  const legacy = raw.trim().toLowerCase();
  if (legacy === "completed") return "COMPLETED";
  if (legacy === "cancelled" || legacy === "canceled") return "CANCELLED";
  if (legacy === "no-show" || legacy === "no_show") return "NO_SHOW";
  return "SCHEDULED";
}

export type ReservationLifecycle =
  | "Active"
  | "Expiring today"
  | "Expired"
  | "Converted"
  | "Released"
  | "CancelRequested"
  | "Cancelled";

export interface ReservationExtension {
  extendedAt: string;
  previousExpiresAt: string;
  newExpiresAt: string;
  actorId: string;
  note?: string;
}

export interface CancelRequest {
  id: string;
  entityType: "reservation" | "booking";
  entityId: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface AssignmentHistoryEntry {
  at: string;
  actorId: string;
  action: "assign" | "remove" | "reassign";
  agentId: string;
  previousAgentId?: string;
  note?: string;
}

export const DEFAULT_RESERVATION_HOURS = 48;

export function isoNow(d = new Date()): string {
  return d.toISOString();
}

export function addHoursIso(from: string | Date, hours: number): string {
  const d = typeof from === "string" ? new Date(from) : new Date(from.getTime());
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

/** Deterministic expiry evaluation — call on load/action (no background timers). */
export function evaluateReservationState(
  r: Pick<Reservation, "expiresAt" | "state"> & {
    cancelRequestStatus?: string;
  },
  now: Date = new Date(),
): ReservationLifecycle {
  if (r.state === "Converted") return "Converted";
  if ((r.state as string) === "Released") return "Released";
  if ((r.state as string) === "Cancelled") return "Cancelled";
  if (r.cancelRequestStatus === "APPROVED") return "Cancelled";
  if (r.cancelRequestStatus === "PENDING") return "CancelRequested";
  const exp = new Date(r.expiresAt);
  if (Number.isNaN(exp.getTime())) return (r.state as ReservationLifecycle) || "Active";
  if (exp.getTime() <= now.getTime()) return "Expired";
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  if (exp.getTime() <= endOfToday.getTime()) return "Expiring today";
  return "Active";
}

export function applyReservationExpiry<T extends Reservation>(
  list: T[],
  now: Date = new Date(),
): T[] {
  return list.map((r) => {
    const next = evaluateReservationState(r, now);
    if (next === (r.state as string)) return r;
    return { ...r, state: next as Reservation["state"] };
  });
}

export function hasActiveReservationOnPlot(
  reservations: Reservation[],
  plotId: string,
  excludeId?: string,
  now: Date = new Date(),
): boolean {
  return reservations.some((r) => {
    if (r.plotId !== plotId) return false;
    if (excludeId && r.id === excludeId) return false;
    const s = evaluateReservationState(r, now);
    return s === "Active" || s === "Expiring today" || s === "CancelRequested";
  });
}

export function canReservePlot(
  plot: Plot,
  reservations: Reservation[],
  now: Date = new Date(),
): { ok: true } | { ok: false; error: string } {
  const st = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
  if (st !== "AVAILABLE" && st !== "RESALE_AVAILABLE") {
    return { ok: false, error: `Plot is ${st} — reserve only from AVAILABLE / RESALE_AVAILABLE.` };
  }
  if (hasActiveReservationOnPlot(reservations, plot.id, undefined, now)) {
    return { ok: false, error: "Plot already has an active reservation." };
  }
  return { ok: true };
}

export function transitionLeadStage(
  lead: Lead,
  to: LeadStage,
  actorId: string,
  note?: string,
): Lead {
  if (lead.stage === to) return lead;
  const entry: LeadStageHistoryEntry = {
    from: lead.stage,
    to,
    at: isoNow(),
    actorId,
  };
  if (note?.trim()) entry.note = note.trim();
  return {
    ...lead,
    stage: to,
    updatedAt: isoNow(),
    stageHistory: [...lead.stageHistory, entry],
  };
}

export function convertLeadToCustomer(
  lead: Lead,
  customerId: string,
  actorId: string,
): { lead: Lead; customer: Customer } {
  const now = isoNow();
  const customer: Customer = {
    id: customerId,
    name: lead.name,
    phone: lead.mobile,
    email: lead.email ?? `${customerId.toLowerCase()}@example.com`,
    city: lead.preferredLocation ?? "Hyderabad",
    source: lead.source,
    stage: "Lead",
    agentId: lead.assignedAgentId,
    plots: [],
    totalValue: 0,
    paid: 0,
    createdAt: now.slice(0, 10),
  };
  if (lead.alternateMobile) customer.altPhone = lead.alternateMobile;
  if (lead.notes) customer.notes = lead.notes;
  const nextLead = transitionLeadStage(
    lead,
    lead.stage === "BOOKED" ? "BOOKED" : "INTERESTED",
    actorId,
    "Converted to customer",
  );
  return {
    lead: {
      ...nextLead,
      conversionTimestamp: now,
      convertedCustomerId: customerId,
      responsibleAgentId: lead.assignedAgentId,
      updatedAt: now,
    },
    customer,
  };
}

export type BookingCreateInput = {
  id: string;
  customerId: string;
  projectId: string;
  plotId: string;
  agentId: string;
  bookingDate: string;
  bookingAmount: number;
  paymentMode?: Booking["paymentMode"];
  totalPlotPrice: number;
  discount?: number;
  finalAgreedAmount: number;
  notes?: string;
  actorId: string;
  reservationId?: string;
};

export type AtomicBookingResult =
  | {
      ok: true;
      booking: Booking;
      plot: Plot;
      reservation?: Reservation;
      releasedOther?: Reservation[];
    }
  | { ok: false; error: string };

/**
 * Atomic booking create:
 * revalidate → create booking → convert/release reservation → plot BOOKED → histories.
 */
export function createBookingAtomic(
  input: BookingCreateInput,
  ctx: {
    plot: Plot;
    reservations: Reservation[];
    now?: Date;
  },
): AtomicBookingResult {
  const now = ctx.now ?? new Date();
  const plot = { ...ctx.plot };
  let from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);

  if (input.reservationId) {
    const r = ctx.reservations.find((x) => x.id === input.reservationId);
    if (!r || r.plotId !== plot.id) {
      return { ok: false, error: "Reservation not found for plot." };
    }
    const rs = evaluateReservationState(r, now);
    if (rs === "Expired") return { ok: false, error: "Reservation has expired." };
    if (rs === "Converted" || rs === "Released" || rs === "Cancelled") {
      return { ok: false, error: `Reservation is ${rs}.` };
    }
  } else {
    if (from !== "AVAILABLE" && from !== "RESALE_AVAILABLE" && from !== "RESERVED") {
      return { ok: false, error: `Cannot book plot in status ${from}.` };
    }
    if (
      (from === "AVAILABLE" || from === "RESALE_AVAILABLE") &&
      hasActiveReservationOnPlot(ctx.reservations, plot.id, undefined, now)
    ) {
      return { ok: false, error: "Plot already has an active reservation." };
    }
  }

  const history: PlotStatusHistoryEntry[] = [...((plot.statusHistory ?? []) as PlotStatusHistoryEntry[])];

  if (from === "AVAILABLE" || from === "RESALE_AVAILABLE") {
    const mid = applyStatusTransition({
      from,
      to: "RESERVED",
      reason: `Booking ${input.id} (pre-reserve)`,
      actorId: input.actorId,
      source: "SALES_FLOW",
    });
    if (!mid.ok) return { ok: false, error: mid.error };
    history.push(mid.entry);
    from = mid.to;
    plot.status = toLegacyPlotStatus(mid.to) as Plot["status"];
    plot.canonicalStatus = mid.to;
  }

  const booked = applyStatusTransition({
    from,
    to: "BOOKED",
    reason: `Booking ${input.id}`,
    actorId: input.actorId,
    source: "SALES_FLOW",
  });
  if (!booked.ok) return { ok: false, error: booked.error };
  history.push(booked.entry);

  const booking: Booking = {
    id: input.id,
    customerId: input.customerId,
    plotId: input.plotId,
    projectId: input.projectId,
    agentId: input.agentId,
    amount: input.finalAgreedAmount,
    paid: input.bookingAmount,
    date: input.bookingDate,
    stage: "Confirmed",
    bookingNumber: input.id,
    bookingAmount: input.bookingAmount,
    totalPlotPrice: input.totalPlotPrice,
    discount: input.discount ?? 0,
    finalAgreedAmount: input.finalAgreedAmount,
    bookingStatus: "Confirmed",
    documentationStatus: "Pending",
    registrationStatus: "Not started",
  };
  if (input.paymentMode) booking.paymentMode = input.paymentMode;
  if (input.notes?.trim()) booking.notes = input.notes.trim();

  const nextPlot: Plot = {
    ...plot,
    status: toLegacyPlotStatus(booked.to) as Plot["status"],
    canonicalStatus: booked.to,
    customerId: input.customerId,
    agentId: input.agentId,
    statusHistory: history,
  };

  let reservation: Reservation | undefined;
  const releasedOther: Reservation[] = [];
  for (const r of ctx.reservations) {
    if (r.plotId !== plot.id) continue;
    if (input.reservationId && r.id === input.reservationId) {
      reservation = { ...r, state: "Converted" };
      continue;
    }
    const s = evaluateReservationState(r, now);
    if (s === "Active" || s === "Expiring today" || s === "CancelRequested") {
      releasedOther.push({ ...r, state: "Released" as Reservation["state"] });
    }
  }

  const result: AtomicBookingResult = { ok: true, booking, plot: nextPlot };
  if (reservation) result.reservation = reservation;
  if (releasedOther.length) result.releasedOther = releasedOther;
  return result;
}

export function releaseReservationToAvailable(
  reservation: Reservation,
  plot: Plot,
  actorId: string,
  reason = "Reservation released",
): { reservation: Reservation; plot: Plot } | { error: string } {
  const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
  if (from !== "RESERVED") {
    return { error: `Plot is ${from}, expected RESERVED.` };
  }
  const tr = applyStatusTransition({
    from,
    to: "AVAILABLE",
    reason,
    actorId,
    source: "SALES_FLOW",
  });
  if (!tr.ok) return { error: tr.error };
  const { customerId: _cleared, ...plotRest } = plot;
  void _cleared;
  return {
    reservation: { ...reservation, state: "Released" as Reservation["state"] },
    plot: {
      ...plotRest,
      status: toLegacyPlotStatus(tr.to) as Plot["status"],
      canonicalStatus: tr.to,
      statusHistory: [...(plot.statusHistory ?? []), tr.entry],
    },
  };
}

export function expireReservationOnPlot(
  reservation: Reservation,
  plot: Plot,
  actorId: string,
): { reservation: Reservation; plot: Plot } | { error: string } {
  return releaseReservationToAvailable(
    reservation,
    plot,
    actorId,
    `Reservation ${reservation.id} expired`,
  );
}

export function extendReservation(
  reservation: Reservation,
  hours: number,
  actorId: string,
  note?: string,
  now: Date = new Date(),
): Reservation & { extensionHistory: ReservationExtension[] } {
  const prev = reservation.expiresAt;
  const base =
    evaluateReservationState(reservation, now) === "Expired"
      ? now.toISOString()
      : reservation.expiresAt;
  const newExpiresAt = addHoursIso(base, hours);
  const ext: ReservationExtension = {
    extendedAt: isoNow(now),
    previousExpiresAt: prev,
    newExpiresAt,
    actorId,
  };
  if (note?.trim()) ext.note = note.trim();
  const prevHist =
    (reservation as Reservation & { extensionHistory?: ReservationExtension[] }).extensionHistory ??
    [];
  return {
    ...reservation,
    expiresAt: newExpiresAt,
    state: "Active",
    extensionHistory: [...prevHist, ext],
  };
}

export interface SalesDashboardSummary {
  leads: number;
  qualified: number;
  siteVisits: number;
  activeReservations: number;
  bookings: number;
  conversions: number;
}

export function deriveSalesDashboard(input: {
  leads: Lead[];
  siteVisits: SiteVisit[];
  reservations: Reservation[];
  bookings: Booking[];
  projectId: string;
  now?: Date;
}): SalesDashboardSummary {
  const now = input.now ?? new Date();
  const leads = input.leads.filter((l) => l.interestedProjectIds.includes(input.projectId));
  const visits = input.siteVisits.filter((v) => v.projectId === input.projectId);
  const bookings = input.bookings.filter((b) => b.projectId === input.projectId);
  const activeReservations = input.reservations.filter((r) => {
    const s = evaluateReservationState(r, now);
    return s === "Active" || s === "Expiring today";
  }).length;
  return {
    leads: leads.length,
    qualified: leads.filter((l) =>
      (
        [
          "QUALIFIED",
          "SITE_VISIT_PLANNED",
          "SITE_VISIT_COMPLETED",
          "INTERESTED",
          "NEGOTIATION",
          "RESERVED",
          "BOOKED",
        ] as LeadStage[]
      ).includes(l.stage),
    ).length,
    siteVisits: visits.length,
    activeReservations,
    bookings: bookings.length,
    conversions: leads.filter((l) => !!l.convertedCustomerId).length,
  };
}

export function agentOwnsSalesRecord(opts: {
  role: unknown;
  agentId?: string | null;
  recordAgentId?: string | null;
  allAgentsAccess?: boolean;
}): boolean {
  const role = normalizeRole(opts.role);
  if (role === "Founder" || role === "Administrator") return true;
  if (role === "Finance" || role === "Viewer") return true;
  if (role === "Agent" || role === "Sales") {
    if (opts.allAgentsAccess) return true;
    return !!opts.agentId && opts.agentId === opts.recordAgentId;
  }
  return false;
}

export type SalesCustomerView = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  stage: string | null;
  source: string | null;
  agentId: string | null;
  redacted: boolean;
  reason?: string;
};

export function projectCustomerForSalesRole(
  customer: Customer,
  ctx: { role: unknown; agentId?: string | null; allAgentsAccess?: boolean },
): SalesCustomerView {
  const role = normalizeRole(ctx.role);
  if (role === "Customer") {
    return {
      id: customer.id,
      name: null,
      phone: null,
      email: null,
      stage: customer.stage,
      source: null,
      agentId: null,
      redacted: true,
      reason: "Customer denied MAIN Admin sales",
    };
  }
  if (role === "Founder" || role === "Administrator") {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      stage: customer.stage,
      source: customer.source,
      agentId: customer.agentId,
      redacted: false,
    };
  }
  if (role === "Finance") {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      stage: customer.stage,
      source: customer.source,
      agentId: customer.agentId,
      redacted: false,
      reason: "Finance view",
    };
  }
  if (role === "Viewer") {
    return {
      id: customer.id,
      name: customer.name,
      phone: null,
      email: null,
      stage: customer.stage,
      source: customer.source,
      agentId: customer.agentId,
      redacted: true,
      reason: "Viewer limited",
    };
  }
  const owns = agentOwnsSalesRecord({
    role,
    ...(ctx.agentId !== undefined ? { agentId: ctx.agentId } : {}),
    recordAgentId: customer.agentId,
    ...(ctx.allAgentsAccess !== undefined ? { allAgentsAccess: ctx.allAgentsAccess } : {}),
  });
  if (owns) {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      stage: customer.stage,
      source: customer.source,
      agentId: customer.agentId,
      redacted: false,
      reason: "Assigned agent",
    };
  }
  return {
    id: customer.id,
    name: null,
    phone: null,
    email: null,
    stage: customer.stage,
    source: null,
    agentId: customer.agentId,
    redacted: true,
    reason: "Agent: unrelated customer PII redacted",
  };
}

export function projectLeadForSalesRole(
  lead: Lead,
  ctx: { role: unknown; agentId?: string | null; allAgentsAccess?: boolean },
): Lead & { redacted?: boolean } {
  const role = normalizeRole(ctx.role);
  if (role !== "Agent" && role !== "Sales") return { ...lead, redacted: false };
  const owns = agentOwnsSalesRecord({
    role,
    ...(ctx.agentId !== undefined ? { agentId: ctx.agentId } : {}),
    recordAgentId: lead.assignedAgentId,
    ...(ctx.allAgentsAccess !== undefined ? { allAgentsAccess: ctx.allAgentsAccess } : {}),
  });
  if (owns) return { ...lead, redacted: false };
  const {
    email: _e,
    alternateMobile: _a,
    notes: _n,
    ...rest
  } = lead;
  void _e; void _a; void _n;
  return {
    ...rest,
    name: "Restricted",
    mobile: "••••••••••",
    redacted: true,
  };
}

export function canMutateSalesMaster(role: unknown): boolean {
  return salesAccessForRole(role) === "full";
}

export function canAgentOnboardCustomer(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator" || r === "Agent" || r === "Sales";
}

export function canApproveCancellation(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator";
}

export function canRequestCancellation(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator" || r === "Agent" || r === "Sales";
}

export function newCancelRequest(input: {
  id: string;
  entityType: "reservation" | "booking";
  entityId: string;
  reason: string;
  requestedBy: string;
}): CancelRequest {
  return {
    id: input.id,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason.trim(),
    requestedBy: input.requestedBy,
    requestedAt: isoNow(),
    status: "PENDING",
  };
}

export function createLeadDraft(input: {
  id: string;
  name: string;
  mobile: string;
  source: string;
  assignedAgentId: string;
  interestedProjectIds: string[];
  createdBy: string;
  email?: string;
  alternateMobile?: string;
  campaign?: string;
  sourceDetail?: string;
  notes?: string;
  nextFollowUp?: string;
  preferredPlotSize?: string;
  preferredFacing?: string;
  preferredBudgetRange?: string;
  preferredLocation?: string;
}): Lead {
  const now = isoNow();
  const entry: LeadStageHistoryEntry = {
    from: null,
    to: "NEW",
    at: now,
    actorId: input.createdBy,
    note: "Lead created",
  };
  const lead: Lead = {
    id: input.id,
    leadId: input.id,
    name: input.name.trim(),
    mobile: input.mobile.trim(),
    source: input.source,
    assignedAgentId: input.assignedAgentId,
    interestedProjectIds: [...input.interestedProjectIds],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    stage: "NEW",
    stageHistory: [entry],
  };
  if (input.email?.trim()) lead.email = input.email.trim();
  if (input.alternateMobile?.trim()) lead.alternateMobile = input.alternateMobile.trim();
  if (input.campaign?.trim()) lead.campaign = input.campaign.trim();
  if (input.sourceDetail?.trim()) lead.sourceDetail = input.sourceDetail.trim();
  if (input.notes?.trim()) lead.notes = input.notes.trim();
  if (input.nextFollowUp?.trim()) lead.nextFollowUp = input.nextFollowUp.trim();
  if (input.preferredPlotSize?.trim()) lead.preferredPlotSize = input.preferredPlotSize.trim();
  if (input.preferredFacing?.trim()) lead.preferredFacing = input.preferredFacing.trim();
  if (input.preferredBudgetRange?.trim()) lead.preferredBudgetRange = input.preferredBudgetRange.trim();
  if (input.preferredLocation?.trim()) lead.preferredLocation = input.preferredLocation.trim();
  return lead;
}
