import type { Person, Plot, PlatformSeed, Doc, Payment, Booking, Lead, Visit, Reservation, Commission, NotificationItem } from "./seed";

export function projectPlotForAgent(plot: Plot, seed: PlatformSeed, agentId: string) {
  const customer = plot.customerId ? seed.customers.find((c) => c.id === plot.customerId) : undefined;
  const owns = Boolean(plot.agentId === agentId || customer?.agentId === agentId);
  return {
    id: plot.id,
    number: plot.number,
    status: plot.status,
    area: plot.area,
    price: plot.price,
    facing: plot.facing,
    projectId: plot.projectId,
    customer:
      owns && customer
        ? { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email }
        : null,
    redacted: Boolean(customer && !owns),
  };
}

export function projectPlotForCustomer(plot: Plot) {
  const detailVisible = plot.status === "AVAILABLE" || plot.status === "RESALE_AVAILABLE";
  return {
    id: plot.id,
    number: plot.number,
    status: plot.status,
    area: detailVisible ? plot.area : null,
    price: detailVisible ? plot.price : null,
    facing: detailVisible ? plot.facing : null,
    detailVisible,
  };
}

export function customersForAgent(seed: PlatformSeed, agentId: string): Person[] {
  return seed.customers.filter((c) => c.agentId === agentId);
}

export function leadsForAgent(seed: PlatformSeed, agentId: string): Lead[] {
  return seed.leads.filter((l) => l.agentId === agentId);
}

export function bookingsForAgent(seed: PlatformSeed, agentId: string): Booking[] {
  return seed.bookings.filter((b) => b.agentId === agentId);
}

export function visitsForAgent(seed: PlatformSeed, agentId: string): Visit[] {
  return seed.visits.filter((v) => v.agentId === agentId);
}

export function reservationsForAgent(seed: PlatformSeed, agentId: string): Reservation[] {
  return seed.reservations.filter((r) => r.agentId === agentId);
}

export function commissionsForAgent(seed: PlatformSeed, agentId: string): Commission[] {
  return seed.commissions.filter((c) => c.agentId === agentId);
}

export function agentDocuments(seed: PlatformSeed, agentId?: string): Doc[] {
  return seed.documents.filter((d) => {
    if (d.visibility === "AGENT_VISIBLE") return true;
    if (d.visibility !== "CUSTOMER_PROFILE_RELATED") return false;
    if (!agentId || !d.customerId) return false;
    const customer = seed.customers.find((c) => c.id === d.customerId);
    return customer?.agentId === agentId;
  });
}

export function agentNotifications(seed: PlatformSeed, agentId: string): NotificationItem[] {
  return seed.notifications.filter((n) => n.audience === "agent" && n.ownerId === agentId);
}

export function bookingsForCustomer(seed: PlatformSeed, customerId: string): Booking[] {
  return seed.bookings.filter((b) => b.customerId === customerId);
}

export function paymentsForCustomer(seed: PlatformSeed, customerId: string): Payment[] {
  return seed.payments.filter((p) => p.customerId === customerId);
}

export function customerDocuments(seed: PlatformSeed, customerId: string): Doc[] {
  return seed.documents.filter((d) => d.visibility === "CUSTOMER_PROFILE_RELATED" && d.customerId === customerId);
}

export function customerNotifications(seed: PlatformSeed, customerId: string): NotificationItem[] {
  return seed.notifications.filter((n) => n.audience === "customer" && n.ownerId === customerId);
}

export function propertiesForCustomer(seed: PlatformSeed, customerId: string): Plot[] {
  const plotIds = new Set(seed.bookings.filter((b) => b.customerId === customerId).map((b) => b.plotId));
  return seed.plots.filter((p) => p.customerId === customerId || plotIds.has(p.id));
}
