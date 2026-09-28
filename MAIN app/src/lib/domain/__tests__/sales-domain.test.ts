import { describe, expect, it } from "vitest";
import { salesAccessForRole, canEditSalesOps } from "../project-permissions";
import {
  addHoursIso,
  applyReservationExpiry,
  canReservePlot,
  convertLeadToCustomer,
  createBookingAtomic,
  createLeadDraft,
  deriveSalesDashboard,
  evaluateReservationState,
  extendReservation,
  projectCustomerForSalesRole,
  projectLeadForSalesRole,
  releaseReservationToAvailable,
  toCanonicalSiteVisitStatus,
  transitionLeadStage,
} from "../sales";
import type { Customer, Plot, Reservation } from "@/lib/mock-data";

describe("sales permissions", () => {
  it("Founder/Admin full; Finance/Viewer read; Agent limited; Customer denied", () => {
    expect(salesAccessForRole("Founder")).toBe("full");
    expect(salesAccessForRole("Administrator")).toBe("full");
    expect(salesAccessForRole("Finance")).toBe("read");
    expect(salesAccessForRole("Viewer")).toBe("read");
    expect(salesAccessForRole("Agent")).toBe("limited");
    expect(salesAccessForRole("Customer")).toBe("denied");
    expect(canEditSalesOps("Administrator")).toBe(true);
    expect(canEditSalesOps("Finance")).toBe(false);
    expect(canEditSalesOps("Agent")).toBe(false);
  });
});

describe("lead entity + conversion", () => {
  it("creates dedicated lead with stage history and converts without deleting", () => {
    const lead = createLeadDraft({
      id: "LEAD-T1",
      name: "Test Lead",
      mobile: "+91 90000 00001",
      source: "Walk-in",
      assignedAgentId: "brag0001",
      interestedProjectIds: ["PRJ-01"],
      createdBy: "admin@bhairava.com",
    });
    expect(lead.stage).toBe("NEW");
    expect(lead.stageHistory[0]?.to).toBe("NEW");
    const advanced = transitionLeadStage(lead, "QUALIFIED", "brag0001", "qualified");
    expect(advanced.stage).toBe("QUALIFIED");
    expect(advanced.stageHistory).toHaveLength(2);
    const { lead: converted, customer } = convertLeadToCustomer(advanced, "Br999999", "admin");
    expect(converted.convertedCustomerId).toBe("Br999999");
    expect(converted.id).toBe("LEAD-T1");
    expect(customer.name).toBe("Test Lead");
    expect(customer.phone).toBe("+91 90000 00001");
  });
});

describe("reservation expiry + duplicate block", () => {
  const basePlot = {
    id: "PLT-T1",
    projectId: "PRJ-01",
    number: "T1",
    status: "available" as const,
    canonicalStatus: "AVAILABLE" as const,
    areaSqYd: 200,
    pricePerSqYd: 10000,
  } as unknown as Plot;

  it("evaluates expiry deterministically and blocks duplicate active reservation", () => {
    const now = new Date("2026-09-24T12:00:00.000Z");
    const active: Reservation = {
      id: "RSV-T1",
      plotId: "PLT-T1",
      customerId: "Br000001",
      agentId: "brag0001",
      amount: 50000,
      createdAt: "2026-09-23",
      expiresAt: addHoursIso(now, 24),
      state: "Active",
    };
    expect(evaluateReservationState(active, now)).toBe("Active");
    const expired = { ...active, expiresAt: addHoursIso(now, -1) };
    expect(evaluateReservationState(expired, now)).toBe("Expired");
    const evaluated = applyReservationExpiry([expired], now);
    expect(evaluated[0]?.state).toBe("Expired");
    expect(canReservePlot(basePlot, [active], now).ok).toBe(false);
    expect(canReservePlot(basePlot, [expired], now).ok).toBe(true);
  });

  it("extends reservation and releases to AVAILABLE via SALES_FLOW", () => {
    const now = new Date("2026-09-24T12:00:00.000Z");
    const r: Reservation = {
      id: "RSV-T2",
      plotId: "PLT-T1",
      customerId: "Br000001",
      agentId: "brag0001",
      amount: 50000,
      createdAt: "2026-09-23",
      expiresAt: addHoursIso(now, 2),
      state: "Active",
    };
    const ext = extendReservation(r, 48, "admin", "test", now);
    expect(ext.extensionHistory.length).toBe(1);
    expect(evaluateReservationState(ext, now)).toBe("Active");
    const reservedPlot = {
      ...basePlot,
      status: "reserved" as const,
      canonicalStatus: "RESERVED" as const,
    } as unknown as Plot;
    const released = releaseReservationToAvailable(r, reservedPlot, "admin");
    expect("error" in released).toBe(false);
    if (!("error" in released)) {
      expect(released.plot.canonicalStatus).toBe("AVAILABLE");
      expect(released.reservation.state).toBe("Released");
    }
  });
});

describe("atomic booking", () => {
  it("revalidates → books → converts reservation → plot BOOKED", () => {
    const plot = {
      id: "PLT-T3",
      projectId: "PRJ-01",
      number: "T3",
      status: "reserved",
      canonicalStatus: "RESERVED",
      areaSqYd: 200,
      pricePerSqYd: 10000,
      statusHistory: [],
    } as unknown as Plot;
    const now = new Date("2026-09-24T12:00:00.000Z");
    const r: Reservation = {
      id: "RSV-T3",
      plotId: "PLT-T3",
      customerId: "Br000001",
      agentId: "brag0001",
      amount: 50000,
      createdAt: "2026-09-23",
      expiresAt: addHoursIso(now, 24),
      state: "Active",
    };
    const result = createBookingAtomic(
      {
        id: "BKG-T3",
        customerId: "Br000001",
        projectId: "PRJ-01",
        plotId: "PLT-T3",
        agentId: "brag0001",
        bookingDate: "2026-09-24",
        bookingAmount: 50000,
        totalPlotPrice: 2000000,
        discount: 0,
        finalAgreedAmount: 2000000,
        actorId: "admin",
        reservationId: "RSV-T3",
      },
      { plot, reservations: [r], now },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plot.canonicalStatus).toBe("BOOKED");
      expect(result.reservation?.state).toBe("Converted");
      expect(result.booking.bookingNumber).toBe("BKG-T3");
    }
  });

  it("blocks booking when reservation expired", () => {
    const plot = {
      id: "PLT-T4",
      projectId: "PRJ-01",
      number: "T4",
      status: "reserved",
      canonicalStatus: "RESERVED",
      areaSqYd: 200,
      pricePerSqYd: 10000,
    } as unknown as Plot;
    const now = new Date("2026-09-24T12:00:00.000Z");
    const r: Reservation = {
      id: "RSV-T4",
      plotId: "PLT-T4",
      customerId: "Br000001",
      agentId: "brag0001",
      amount: 50000,
      createdAt: "2026-09-20",
      expiresAt: addHoursIso(now, -5),
      state: "Active",
    };
    const result = createBookingAtomic(
      {
        id: "BKG-T4",
        customerId: "Br000001",
        projectId: "PRJ-01",
        plotId: "PLT-T4",
        agentId: "brag0001",
        bookingDate: "2026-09-24",
        bookingAmount: 50000,
        totalPlotPrice: 2000000,
        finalAgreedAmount: 2000000,
        actorId: "admin",
        reservationId: "RSV-T4",
      },
      { plot, reservations: [r], now },
    );
    expect(result.ok).toBe(false);
  });
});

describe("PII projection + site visit status", () => {
  const customer = {
    id: "Br000001",
    name: "Ananya Sharma",
    phone: "+91 1",
    email: "a@example.com",
    city: "Hyd",
    source: "Walk-in",
    stage: "Booked",
    agentId: "brag0001",
    plots: [],
    totalValue: 100,
    paid: 10,
    createdAt: "2026-01-01",
  } as Customer;

  it("redacts unrelated customer PII for Agent", () => {
    const view = projectCustomerForSalesRole(customer, { role: "Agent", agentId: "brag0002" });
    expect(view.redacted).toBe(true);
    expect(view.name).toBeNull();
    expect(view.phone).toBeNull();
    const owned = projectCustomerForSalesRole(customer, { role: "Agent", agentId: "brag0001" });
    expect(owned.redacted).toBe(false);
    expect(owned.name).toBe("Ananya Sharma");
  });

  it("redacts unrelated lead for Agent", () => {
    const lead = createLeadDraft({
      id: "LEAD-PII",
      name: "Secret",
      mobile: "+91 999",
      source: "X",
      assignedAgentId: "brag0001",
      interestedProjectIds: ["PRJ-01"],
      createdBy: "admin",
    });
    const red = projectLeadForSalesRole(lead, { role: "Agent", agentId: "brag0002" });
    expect(red.redacted).toBe(true);
    expect(red.name).toBe("Restricted");
  });

  it("normalizes site visit statuses", () => {
    expect(toCanonicalSiteVisitStatus("Scheduled")).toBe("SCHEDULED");
    expect(toCanonicalSiteVisitStatus("Completed")).toBe("COMPLETED");
    expect(toCanonicalSiteVisitStatus("No-show")).toBe("NO_SHOW");
    expect(toCanonicalSiteVisitStatus("Cancelled")).toBe("CANCELLED");
  });

  it("derives dashboard counts only from provided records", () => {
    const lead = createLeadDraft({
      id: "LEAD-D1",
      name: "D",
      mobile: "1",
      source: "X",
      assignedAgentId: "brag0001",
      interestedProjectIds: ["PRJ-01"],
      createdBy: "admin",
    });
    const qualified = transitionLeadStage(lead, "QUALIFIED", "admin");
    const summary = deriveSalesDashboard({
      leads: [qualified],
      siteVisits: [{ id: "SV-1", customerId: "x", projectId: "PRJ-01", agentId: "a", date: "2026-09-24", time: "10:00", status: "Scheduled" }],
      reservations: [],
      bookings: [],
      projectId: "PRJ-01",
    });
    expect(summary.leads).toBe(1);
    expect(summary.qualified).toBe(1);
    expect(summary.siteVisits).toBe(1);
    expect(summary.bookings).toBe(0);
  });
});
