import { describe, expect, it } from "vitest";
import { toCanonicalPlotStatus, countByCanonicalStatus } from "../plot-status";
import { legacyProjectStatusToLifecycle, enforceVisibilityForLifecycle } from "../lifecycle";
import { setupAccessForRole, canEditSetup, canViewSetup } from "../project-permissions";
import { evaluateReadiness } from "../readiness";
import { migratePersisted, normalizeProjectRecord } from "../migrate";

describe("plot status adapters", () => {
  it("maps legacy lowercase to canonical", () => {
    expect(toCanonicalPlotStatus("available")).toBe("AVAILABLE");
    expect(toCanonicalPlotStatus("reserved")).toBe("RESERVED");
    expect(toCanonicalPlotStatus("booked")).toBe("BOOKED");
    expect(toCanonicalPlotStatus("registered")).toBe("REGISTERED");
    expect(toCanonicalPlotStatus("resale")).toBe("RESALE_AVAILABLE");
    expect(toCanonicalPlotStatus("sold")).toBe("SOLD");
    expect(toCanonicalPlotStatus("hold")).toBe("BLOCKED");
  });

  it("passes through canonical", () => {
    expect(toCanonicalPlotStatus("UNDER_DOCUMENTATION")).toBe("UNDER_DOCUMENTATION");
  });

  it("counts all nine statuses", () => {
    const counts = countByCanonicalStatus([
      { status: "available" },
      { status: "AVAILABLE" },
      { status: "resale" },
      { status: "hold" },
    ]);
    expect(counts.AVAILABLE).toBe(2);
    expect(counts.RESALE_AVAILABLE).toBe(1);
    expect(counts.BLOCKED).toBe(1);
  });
});

describe("lifecycle adapters", () => {
  it("maps legacy project statuses", () => {
    expect(legacyProjectStatusToLifecycle("Draft")).toBe("DRAFT");
    expect(legacyProjectStatusToLifecycle("Pre-launch")).toBe("DRAFT");
    expect(legacyProjectStatusToLifecycle("Active")).toBe("ACTIVE");
    expect(legacyProjectStatusToLifecycle("On hold")).toBe("ON_HOLD");
    expect(legacyProjectStatusToLifecycle("Sold out")).toBe("COMPLETED");
    expect(legacyProjectStatusToLifecycle("Inactive")).toBe("ARCHIVED");
  });

  it("forces publish flags off in DRAFT", () => {
    expect(
      enforceVisibilityForLifecycle("DRAFT", { agentVisible: true, customerListed: true }),
    ).toEqual({ agentVisible: false, customerListed: false });
  });
});

describe("setup permissions", () => {
  it("Founder/Administrator full; Finance/Viewer read; Agent/Customer denied", () => {
    expect(setupAccessForRole("Founder")).toBe("full");
    expect(setupAccessForRole("Administrator")).toBe("full");
    expect(setupAccessForRole("Finance")).toBe("read");
    expect(setupAccessForRole("Viewer")).toBe("read");
    expect(setupAccessForRole("Agent")).toBe("denied");
    expect(setupAccessForRole("Customer")).toBe("denied");
    expect(setupAccessForRole("Sales")).toBe("denied");
    expect(canEditSetup("Administrator")).toBe(true);
    expect(canEditSetup("Finance")).toBe(false);
    expect(canViewSetup("Finance")).toBe(true);
    expect(canViewSetup("Agent")).toBe(false);
  });
});

describe("readiness evaluator", () => {
  const base = {
    name: "Greenfields",
    code: "BGF",
    projectType: "Plotted development",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "509216",
    location: "Shadnagar",
    inventory: [{ number: "A-101", areaSqYd: 200, pricePerSqYd: 25000, status: "available" }],
    lifecycleStatus: "DRAFT" as const,
  };

  it("blocks ACTIVE when inventory empty", () => {
    const r = evaluateReadiness({ ...base, inventory: [] });
    expect(r.canActivate).toBe(false);
    expect(r.blockers.some((b) => b.id === "A3")).toBe(true);
  });

  it("allows activate when A1–A4 pass", () => {
    const r = evaluateReadiness(base);
    expect(r.canActivate).toBe(true);
  });

  it("blocks agentVisible until ACTIVE + agents", () => {
    const draft = evaluateReadiness({ ...base, agentVisible: true });
    expect(draft.canSetAgentVisible).toBe(false);
    const active = evaluateReadiness({
      ...base,
      lifecycleStatus: "ACTIVE",
      agents: ["brag0001"],
    });
    expect(active.canSetAgentVisible).toBe(true);
  });

  it("requires layout for customerListed", () => {
    const r = evaluateReadiness({
      ...base,
      lifecycleStatus: "ACTIVE",
      description: "Public project",
      customerListed: true,
    });
    expect(r.canSetCustomerListed).toBe(false);
    expect(r.blockers.some((b) => b.id === "C4")).toBe(true);
    const withLayout = evaluateReadiness({
      ...base,
      lifecycleStatus: "ACTIVE",
      description: "Public project",
      layoutImage: "https://example.com/layout.png",
    });
    expect(withLayout.canSetCustomerListed).toBe(true);
  });

  it("escalates RERA when mandatory", () => {
    const r = evaluateReadiness({ ...base, reraMandatory: true });
    expect(r.canActivate).toBe(false);
    expect(r.blockers.some((b) => b.id === "W4")).toBe(true);
  });
});

describe("migrate persisted", () => {
  it("normalizes legacy projects without dropping records", () => {
    const migrated = migratePersisted({
      projects: [
        {
          id: "PRJ-01",
          name: "Test",
          code: "T",
          status: "Pre-launch",
          agentVisible: true,
          customerListed: true,
        },
        { id: "PRJ-02", name: "Active one", code: "A", status: "Active" },
      ],
      extraPlots: [{ id: "p1", status: "resale" }],
    });
    expect(migrated.projects).toHaveLength(2);
    expect(migrated.projects?.[0]?.["lifecycleStatus"]).toBe("DRAFT");
    expect(migrated.projects?.[0]?.["agentVisible"]).toBe(false);
    expect(migrated.projects?.[0]?.["customerListed"]).toBe(false);
    expect(migrated.projects?.[1]?.["lifecycleStatus"]).toBe("ACTIVE");
    expect(migrated.extraPlots?.[0]?.["canonicalStatus"]).toBe("RESALE_AVAILABLE");
    expect(migrated.schemaVersion).toBeGreaterThanOrEqual(4);
  });

  it("Inactive maps to ARCHIVED conservatively", () => {
    const p = normalizeProjectRecord({ id: "x", status: "Inactive" });
    expect(p.lifecycleStatus).toBe("ARCHIVED");
  });
});
