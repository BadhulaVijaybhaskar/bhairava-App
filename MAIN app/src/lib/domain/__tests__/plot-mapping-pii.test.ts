import { describe, expect, it } from "vitest";
import {
  linkPolygonToPlot,
  relinkPolygon,
  unlinkPolygonFromPlot,
  validatePolygon,
  plotHasActiveMapping,
} from "../plot-mapping";
import {
  projectPlotForRole,
  redactPlotCustomerPii,
  customerDisplayName,
} from "../plot-pii";
import type { Customer, Plot } from "@/lib/mock-data";

const basePlot = (over: Partial<Plot> = {}): Plot => ({
  id: "PLT-1",
  number: "BGF-001",
  projectId: "PRJ-01",
  areaSqYd: 200,
  facing: "East",
  pricePerSqYd: 25000,
  status: "reserved",
  canonicalStatus: "RESERVED",
  points: [
    [10, 10],
    [20, 10],
    [20, 20],
    [10, 20],
  ],
  customerId: "CUS-1",
  agentId: "brag0001",
  ...over,
});

const customer: Customer = {
  id: "CUS-1",
  name: "Ananya Rao",
  phone: "+91 90000 11111",
  email: "ananya@example.com",
  city: "Hyderabad",
  source: "Walk-in",
  stage: "Reserved",
  agentId: "brag0001",
  plots: ["PLT-1"],
  totalValue: 50_00_000,
  paid: 1_00_000,
  createdAt: "2026-01-01",
  address: "12 MG Road",
  pan: "ABCDE1234F",
  aadhaar: "1234-5678-9012",
  kycStatus: "Verified",
};

describe("plot mapping 1:1", () => {
  it("validates polygon and rejects short rings", () => {
    expect(validatePolygon([[1, 1], [2, 2]]).ok).toBe(false);
    expect(validatePolygon([[1, 1], [2, 2], [3, 1]]).ok).toBe(true);
  });

  it("rejects linking onto an already-mapped plot", () => {
    const plot = basePlot();
    const r = linkPolygonToPlot({
      plot,
      points: [
        [30, 30],
        [40, 30],
        [40, 40],
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/already has an active/);
  });

  it("allows link when unmapped or replaceExisting", () => {
    const unmapped = basePlot({ points: [] });
    const ok = linkPolygonToPlot({
      plot: unmapped,
      points: [
        [1, 1],
        [2, 1],
        [2, 2],
      ],
    });
    expect(ok.ok).toBe(true);
    const replace = linkPolygonToPlot({
      plot: basePlot(),
      points: [
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      replaceExisting: true,
    });
    expect(replace.ok).toBe(true);
  });

  it("unlinks to empty points and relinks 1:1", () => {
    expect(unlinkPolygonFromPlot().points).toEqual([]);
    const source = basePlot({ id: "A", number: "A-1" });
    const target = basePlot({ id: "B", number: "B-1", points: [], customerId: undefined });
    const moved = relinkPolygon({ source, target });
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.sourcePoints).toEqual([]);
      expect(plotHasActiveMapping({ points: moved.targetPoints })).toBe(true);
    }
    const blocked = relinkPolygon({
      source: basePlot({ id: "A" }),
      target: basePlot({ id: "B" }),
    });
    expect(blocked.ok).toBe(false);
  });
});

describe("agent PII projection", () => {
  const customers = [customer];

  it("Founder/Admin see full customer PII", () => {
    const view = redactPlotCustomerPii(basePlot(), {
      role: "Administrator",
      customers,
    });
    expect(view?.name).toBe("Ananya Rao");
    expect(view?.phone).toMatch(/90000/);
    expect(view?.pan).toBe("ABCDE1234F");
    expect(view?.redacted).toBe(false);
  });

  it("Finance sees financial subset without PAN/Aadhaar/address", () => {
    const view = redactPlotCustomerPii(basePlot(), { role: "Finance", customers });
    expect(view?.name).toBe("Ananya Rao");
    expect(view?.totalValue).toBe(50_00_000);
    expect(view?.pan).toBeNull();
    expect(view?.aadhaar).toBeNull();
    expect(view?.address).toBeNull();
  });

  it("Agent without assignment sees status-only (no PII)", () => {
    const view = redactPlotCustomerPii(basePlot(), {
      role: "Agent",
      agentId: "brag9999",
      customers,
    });
    expect(view?.redacted).toBe(true);
    expect(view?.name).toBeNull();
    expect(view?.phone).toBeNull();
    expect(view?.email).toBeNull();
    expect(customerDisplayName(view)).toBe("Restricted");
  });

  it("Assigned agent may see contact fields but not KYC/payment totals", () => {
    const view = redactPlotCustomerPii(basePlot(), {
      role: "Agent",
      agentId: "brag0001",
      customers,
    });
    expect(view?.redacted).toBe(false);
    expect(view?.name).toBe("Ananya Rao");
    expect(view?.phone).toBeTruthy();
    expect(view?.pan).toBeNull();
    expect(view?.totalValue).toBeNull();
  });

  it("projectPlotForRole attaches canonical + customerView", () => {
    const projected = projectPlotForRole(basePlot(), {
      role: "Viewer",
      customers,
    });
    expect(projected.canonical).toBe("RESERVED");
    expect(projected.customerView?.name).toBe("Ananya Rao");
    expect(projected.customerView?.phone).toBeNull();
  });

  it("Customer role never sees other customers", () => {
    const view = redactPlotCustomerPii(basePlot(), { role: "Customer", customers });
    expect(view?.redacted).toBe(true);
    expect(view?.name).toBeNull();
  });
});
