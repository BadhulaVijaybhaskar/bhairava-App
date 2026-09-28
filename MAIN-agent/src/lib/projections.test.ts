import { describe, expect, it } from "vitest";
import { PLATFORM_SEED } from "./seed";
import {
  agentDocuments,
  bookingsForAgent,
  bookingsForCustomer,
  customerDocuments,
  customersForAgent,
  leadsForAgent,
  paymentsForCustomer,
  projectPlotForAgent,
  projectPlotForCustomer,
  propertiesForCustomer,
} from "./projections";

describe("agent projections", () => {
  it("shows PII only for owned customers and redacts others", () => {
    const reservedOther = PLATFORM_SEED.plots.find((p) => p.id === "PLT-102")!;
    const bookedMine = PLATFORM_SEED.plots.find((p) => p.id === "PLT-103")!;
    const a1 = projectPlotForAgent(reservedOther, PLATFORM_SEED, "AGT-01");
    const a2 = projectPlotForAgent(reservedOther, PLATFORM_SEED, "AGT-02");
    const mine = projectPlotForAgent(bookedMine, PLATFORM_SEED, "AGT-01");
    expect(a1.redacted).toBe(true);
    expect(a1.customer).toBeNull();
    expect(a2.customer?.name).toBe("Rahul Mehta");
    expect(mine.customer?.name).toBe("Ananya Rao");
  });

  it("scopes leads/customers/bookings/docs by agent", () => {
    expect(leadsForAgent(PLATFORM_SEED, "AGT-01").every((l) => l.agentId === "AGT-01")).toBe(true);
    expect(customersForAgent(PLATFORM_SEED, "AGT-02").map((c) => c.id).sort()).toEqual(["CUS-02", "CUS-03"]);
    expect(bookingsForAgent(PLATFORM_SEED, "AGT-01").map((b) => b.id)).toEqual(["BK-01"]);
    expect(bookingsForAgent(PLATFORM_SEED, "AGT-02").map((b) => b.id)).toEqual(["BK-02"]);
    expect(agentDocuments(PLATFORM_SEED, "AGT-01").map((d) => d.id).sort()).toEqual(["DOC-AG", "DOC-CU1"]);
    expect(agentDocuments(PLATFORM_SEED, "AGT-02").map((d) => d.id).sort()).toEqual(["DOC-AG", "DOC-CU2"]);
  });
});

describe("customer projections", () => {
  it("hides pricing detail on non-available plots and never exposes other buyers", () => {
    const reserved = projectPlotForCustomer(PLATFORM_SEED.plots.find((p) => p.id === "PLT-102")!);
    const available = projectPlotForCustomer(PLATFORM_SEED.plots.find((p) => p.id === "PLT-101")!);
    expect(reserved.detailVisible).toBe(false);
    expect(reserved.price).toBeNull();
    expect(available.detailVisible).toBe(true);
    expect(available.price).toBe(4200000);
    expect("customer" in reserved).toBe(false);
  });

  it("scopes bookings/payments/docs/properties to the signed-in customer", () => {
    expect(bookingsForCustomer(PLATFORM_SEED, "CUS-01").map((b) => b.id)).toEqual(["BK-01"]);
    expect(bookingsForCustomer(PLATFORM_SEED, "CUS-02")).toHaveLength(0);
    expect(paymentsForCustomer(PLATFORM_SEED, "CUS-01").every((p) => p.customerId === "CUS-01")).toBe(true);
    expect(customerDocuments(PLATFORM_SEED, "CUS-01").map((d) => d.id)).toEqual(["DOC-CU1"]);
    expect(customerDocuments(PLATFORM_SEED, "CUS-02").map((d) => d.id)).toEqual(["DOC-CU2"]);
    expect(propertiesForCustomer(PLATFORM_SEED, "CUS-01").some((p) => p.id === "PLT-103")).toBe(true);
  });
});
