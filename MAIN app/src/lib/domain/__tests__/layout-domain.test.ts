import { describe, expect, it } from "vitest";
import {
  layoutAccessForRole,
  canEditPlotMaster,
  canChangePlotStatus,
  canCreatePlot,
  canOverridePlotPrice,
  canViewLayout,
  setupAccessForRole,
} from "../project-permissions";
import {
  applyStatusTransition,
  isTransitionAllowed,
  allowedTargets,
  validateBulkTransitions,
} from "../plot-transitions";
import { calculatePlotPrice, applyPriceOverride, clearPriceOverride } from "../plot-pricing";
import { toCanonicalCorner, cornerIsPremium } from "../plot-corner";
import { defaultPricing } from "@/lib/project-config";

describe("layout permissions", () => {
  it("Founder/Administrator full; Finance/Viewer read; Agent inventory; Customer denied", () => {
    expect(layoutAccessForRole("Founder")).toBe("full");
    expect(layoutAccessForRole("Administrator")).toBe("full");
    expect(layoutAccessForRole("Finance")).toBe("read");
    expect(layoutAccessForRole("Viewer")).toBe("read");
    expect(layoutAccessForRole("Agent")).toBe("inventory");
    expect(layoutAccessForRole("Sales")).toBe("inventory");
    expect(layoutAccessForRole("Customer")).toBe("denied");
    expect(canEditPlotMaster("Administrator")).toBe(true);
    expect(canEditPlotMaster("Finance")).toBe(false);
    expect(canEditPlotMaster("Agent")).toBe(false);
    expect(canChangePlotStatus("Founder")).toBe(true);
    expect(canChangePlotStatus("Viewer")).toBe(false);
    expect(canCreatePlot("Agent")).toBe(false);
    expect(canOverridePlotPrice("Administrator")).toBe(true);
    expect(canOverridePlotPrice("Finance")).toBe(false);
    expect(canViewLayout("Agent")).toBe(true);
    expect(canViewLayout("Customer")).toBe(false);
  });

  it("does not break Setup matrix", () => {
    expect(setupAccessForRole("Founder")).toBe("full");
    expect(setupAccessForRole("Agent")).toBe("denied");
  });
});

describe("plot status transitions", () => {
  it("allows happy-path AVAILABLE → RESERVED with ADMIN_MANUAL reason", () => {
    expect(isTransitionAllowed("AVAILABLE", "RESERVED")).toBe(true);
    const r = applyStatusTransition({
      from: "AVAILABLE",
      to: "RESERVED",
      reason: "Customer interest",
      actorId: "admin@bhairava.com",
      source: "ADMIN_MANUAL",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entry.fromStatus).toBe("AVAILABLE");
      expect(r.entry.toStatus).toBe("RESERVED");
      expect(r.entry.source).toBe("ADMIN_MANUAL");
      expect(r.entry.reason).toBe("Customer interest");
    }
  });

  it("rejects illegal jumps and empty ADMIN_MANUAL reason", () => {
    expect(isTransitionAllowed("AVAILABLE", "SOLD")).toBe(false);
    expect(
      applyStatusTransition({ from: "AVAILABLE", to: "SOLD", reason: "skip", actorId: "a" }).ok,
    ).toBe(false);
    expect(
      applyStatusTransition({
        from: "AVAILABLE",
        to: "BLOCKED",
        reason: "  ",
        actorId: "a",
        source: "ADMIN_MANUAL",
      }).ok,
    ).toBe(false);
  });

  it("lists allow-list targets and validates bulk", () => {
    expect(allowedTargets("RESERVED")).toEqual(
      expect.arrayContaining(["AVAILABLE", "CANCELLED", "BOOKED"]),
    );
    const bulk = validateBulkTransitions(
      [
        { id: "1", from: "AVAILABLE" },
        { id: "2", from: "BOOKED" },
      ],
      "RESERVED",
      "bulk hold adjust",
      "admin",
    );
    expect(bulk[0]?.result.ok).toBe(true);
    expect(bulk[1]?.result.ok).toBe(false);
  });

  it("maps legacy lowercase at edges", () => {
    const r = applyStatusTransition({
      from: "available",
      to: "BLOCKED",
      reason: "Legal dispute",
      actorId: "admin",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.from).toBe("AVAILABLE");
  });
});

describe("plot price calculation", () => {
  const rules = defaultPricing();

  it("sums base + facing + corner premiums", () => {
    const r = calculatePlotPrice(
      { areaSqYd: 200, facing: "East", corner: "NE", features: ["Park facing"] },
      rules,
    );
    expect(r.isManualOverride).toBe(false);
    expect(r.ratePerSqYd).toBeGreaterThan(rules.baseRatePerSqYd);
    expect(r.total).toBe(r.ratePerSqYd * 200);
  });

  it("hard override wins and requires reason + permission", () => {
    const priced = calculatePlotPrice(
      { areaSqYd: 100, facing: "West", rateOverride: 99999 },
      rules,
    );
    expect(priced.isManualOverride).toBe(true);
    expect(priced.ratePerSqYd).toBe(99999);
    expect(applyPriceOverride({ newRate: 50000, reason: "", canOverride: true }).ok).toBe(false);
    expect(applyPriceOverride({ newRate: 50000, reason: "VIP", canOverride: false }).ok).toBe(false);
    expect(applyPriceOverride({ newRate: 50000, reason: "VIP deal", canOverride: true }).ok).toBe(
      true,
    );
    expect(clearPriceOverride(false).ok).toBe(false);
    expect(clearPriceOverride(true).ok).toBe(true);
  });

  it("does not drop override when attributes change (caller keeps rateOverride)", () => {
    const before = calculatePlotPrice(
      { areaSqYd: 200, facing: "East", rateOverride: 40000 },
      rules,
    );
    const after = calculatePlotPrice(
      { areaSqYd: 240, facing: "North", corner: "SW", rateOverride: 40000 },
      rules,
    );
    expect(before.ratePerSqYd).toBe(40000);
    expect(after.ratePerSqYd).toBe(40000);
    expect(after.total).toBe(40000 * 240);
  });
});

describe("corner canonicalization", () => {
  it("maps legacy labels and NONE is not premium", () => {
    expect(toCanonicalCorner("North-East")).toBe("NE");
    expect(toCanonicalCorner("Not corner")).toBe("NONE");
    expect(cornerIsPremium("NONE")).toBe(false);
    expect(cornerIsPremium("SE")).toBe(true);
  });
});
