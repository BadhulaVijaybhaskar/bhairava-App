/**
 * Role-aware plot / customer PII projection.
 * Enforce in domain (not CSS column hide). Agent must not see unrelated customer PII.
 */
import type { Customer, Plot } from "@/lib/mock-data";
import type { AppRole } from "./project-permissions";
import { normalizeRole } from "./project-permissions";
import { toCanonicalPlotStatus, type CanonicalPlotStatus } from "./plot-status";

export type CustomerPiiView = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  kycStatus: string | null;
  pan: string | null;
  aadhaar: string | null;
  totalValue: number | null;
  paid: number | null;
  redacted: boolean;
  reason?: string;
};

export type ProjectedPlot = Plot & {
  canonical: CanonicalPlotStatus;
  customerView: CustomerPiiView | null;
};

export type PiiContext = {
  role: unknown;
  /** Logged-in agent id when role is Agent/Sales (optional). */
  agentId?: string | null | undefined;
  /** Session email — matched against agent.email when agentId absent. */
  sessionEmail?: string | null | undefined;
  customers: Customer[];
  /** Optional map agent email → agent id for demo role switches. */
  agentEmailToId?: Record<string, string> | undefined;
};

function resolveAgentId(ctx: PiiContext): string | null {
  if (ctx.agentId) return ctx.agentId;
  const email = (ctx.sessionEmail ?? "").trim().toLowerCase();
  if (!email || !ctx.agentEmailToId) return null;
  return ctx.agentEmailToId[email] ?? null;
}

function agentOwnsRelationship(
  plot: Plot,
  customer: Customer | undefined,
  agentId: string | null,
): boolean {
  if (!agentId) return false;
  if (plot.agentId && plot.agentId === agentId) return true;
  if (customer?.agentId && customer.agentId === agentId) return true;
  return false;
}

function fullCustomerView(c: Customer): CustomerPiiView {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    address: c.address ?? null,
    kycStatus: c.kycStatus ?? null,
    pan: c.pan ?? null,
    aadhaar: c.aadhaar ?? null,
    totalValue: c.totalValue,
    paid: c.paid,
    redacted: false,
  };
}

function financeCustomerView(c: Customer): CustomerPiiView {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    address: null,
    kycStatus: c.kycStatus ?? null,
    pan: null,
    aadhaar: null,
    totalValue: c.totalValue,
    paid: c.paid,
    redacted: false,
    reason: "Finance subset",
  };
}

function statusOnlyCustomerView(c: Customer): CustomerPiiView {
  return {
    id: c.id,
    name: null,
    phone: null,
    email: null,
    city: null,
    address: null,
    kycStatus: null,
    pan: null,
    aadhaar: null,
    totalValue: null,
    paid: null,
    redacted: true,
    reason: "Agent: unrelated customer PII redacted",
  };
}

/**
 * Project customer PII attached to a plot for the viewer role.
 * Agent: status relationship only unless assigned; never other customers' PII.
 */
export function redactPlotCustomerPii(
  plot: Plot,
  ctx: PiiContext,
): CustomerPiiView | null {
  if (!plot.customerId) return null;
  const customer = ctx.customers.find((c) => c.id === plot.customerId);
  if (!customer) return null;

  const role = normalizeRole(ctx.role);

  if (role === "Customer") {
    return {
      ...statusOnlyCustomerView(customer),
      reason: "Customer role cannot view other customers",
    };
  }

  if (role === "Founder" || role === "Administrator") {
    return fullCustomerView(customer);
  }

  if (role === "Finance") {
    return financeCustomerView(customer);
  }

  if (role === "Viewer") {
    return {
      id: customer.id,
      name: customer.name,
      phone: null,
      email: null,
      city: customer.city,
      address: null,
      kycStatus: null,
      pan: null,
      aadhaar: null,
      totalValue: null,
      paid: null,
      redacted: true,
      reason: "Viewer: limited identity",
    };
  }

  // Agent / Sales
  const agentId = resolveAgentId(ctx);
  if (agentOwnsRelationship(plot, customer, agentId)) {
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      address: null,
      kycStatus: null,
      pan: null,
      aadhaar: null,
      totalValue: null,
      paid: null,
      redacted: false,
      reason: "Assigned agent",
    };
  }
  return statusOnlyCustomerView(customer);
}

export function projectPlotForRole(plot: Plot, ctx: PiiContext): ProjectedPlot {
  return {
    ...plot,
    canonical: toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status),
    customerView: redactPlotCustomerPii(plot, ctx),
  };
}

export function projectPlotsForRole(plots: Plot[], ctx: PiiContext): ProjectedPlot[] {
  return plots.map((p) => projectPlotForRole(p, ctx));
}

/** Display helper — never leak redacted fields via empty-string tricks. */
export function customerDisplayName(view: CustomerPiiView | null | undefined): string {
  if (!view) return "—";
  if (view.redacted && !view.name) return "Restricted";
  return view.name ?? "—";
}
