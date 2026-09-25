/**
 * Derive in-app notifications + operational audit rows from real store entities.
 * No invented metrics — only rows grounded in workspace data.
 */
import type { AuditEvent } from "./management";
import type { InAppNotification } from "./management-p6";

export interface DeriveInput {
  bookings: Array<Record<string, unknown> & { id: string }>;
  reservations: Array<Record<string, unknown> & { id: string }>;
  cancelRequests: Array<Record<string, unknown> & { id: string }>;
  financePayments: Array<Record<string, unknown> & { id: string }>;
  paymentSchedules: Array<Record<string, unknown> & { id: string }>;
  opsDocuments: Array<Record<string, unknown> & { id: string }>;
  opsRegistrations: Array<Record<string, unknown> & { id: string }>;
  opsResales: Array<Record<string, unknown> & { id: string }>;
  readIds?: string[];
  now?: Date;
}

function daysUntil(iso: string, now: Date): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 999;
  return Math.ceil((t - now.getTime()) / 86_400_000);
}

function daysPast(iso: string, now: Date): number {
  return -daysUntil(iso, now);
}

function str(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v : "";
}

export function deriveInAppNotifications(input: DeriveInput): InAppNotification[] {
  const now = input.now ?? new Date();
  const read = new Set(input.readIds ?? []);
  const out: InAppNotification[] = [];

  for (const r of input.reservations) {
    const exp = str(r, "expiresAt") || str(r, "expiryDate") || str(r, "expiresOn");
    if (!exp) continue;
    const status = str(r, "status").toLowerCase();
    if (!(status.includes("active") || status.includes("reserved") || status === "open" || status === "hold")) continue;
    const d = daysUntil(exp, now);
    if (d >= 0 && d <= 3) {
      const id = `ntf-res-exp-${r.id}`;
      out.push({
        id,
        kind: "reservation_expiring",
        title: "Reservation expiring",
        detail: `${r.id} expires in ${d} day(s)`,
        entityType: "reservation",
        entityId: r.id,
        href: "/reservations",
        createdAt: now.toISOString(),
        unread: !read.has(id),
      });
    }
  }

  for (const s of input.paymentSchedules) {
    const due = str(s, "dueDate");
    if (!due) continue;
    const status = str(s, "status").toLowerCase();
    if (status.includes("paid") || status.includes("waived") || status.includes("collected")) continue;
    const d = daysUntil(due, now);
    if (d < 0) {
      const id = `ntf-pay-${s.id}-overdue`;
      out.push({
        id,
        kind: "payment_overdue",
        title: "Payment overdue",
        detail: `${s.id} overdue by ${daysPast(due, now)} day(s)`,
        entityType: "payment_schedule",
        entityId: s.id,
        href: "/collections",
        createdAt: now.toISOString(),
        unread: !read.has(id),
      });
    } else if (d <= 7) {
      const id = `ntf-pay-${s.id}-due`;
      out.push({
        id,
        kind: "payment_due",
        title: "Payment due soon",
        detail: `${s.id} due in ${d} day(s)`,
        entityType: "payment_schedule",
        entityId: s.id,
        href: "/collections",
        createdAt: now.toISOString(),
        unread: !read.has(id),
      });
    }
  }

  for (const doc of input.opsDocuments) {
    const status = (str(doc, "status") || str(doc, "verificationStatus") || str(doc, "verified")).toLowerCase();
    if (status.includes("pending") || status.includes("await") || status.includes("submitted") || status === "false") {
      const id = `ntf-doc-${doc.id}`;
      out.push({
        id,
        kind: "document_pending",
        title: "Document pending",
        detail: `${doc.id} awaiting review`,
        entityType: "document",
        entityId: doc.id,
        href: "/documents",
        createdAt: str(doc, "updatedAt") || str(doc, "uploadedAt") || now.toISOString(),
        unread: !read.has(id),
      });
    }
  }

  for (const reg of input.opsRegistrations) {
    const status = str(reg, "status").toLowerCase();
    if (status.includes("schedul")) {
      const id = `ntf-reg-${reg.id}-sched`;
      out.push({
        id,
        kind: "registration_scheduled",
        title: "Registration scheduled",
        detail: `${reg.id} is scheduled`,
        entityType: "registration",
        entityId: reg.id,
        href: "/registrations",
        createdAt: str(reg, "scheduledAt") || now.toISOString(),
        unread: !read.has(id),
      });
    }
    if (status.includes("complet") || status.includes("registered") || status.includes("done")) {
      const id = `ntf-reg-${reg.id}-done`;
      out.push({
        id,
        kind: "registration_completed",
        title: "Registration completed",
        detail: `${reg.id} completed`,
        entityType: "registration",
        entityId: reg.id,
        href: "/registrations",
        createdAt: str(reg, "completedAt") || str(reg, "updatedAt") || now.toISOString(),
        unread: !read.has(id),
      });
    }
  }

  for (const b of input.bookings.slice(0, 50)) {
    const created = str(b, "bookedAt") || str(b, "createdAt") || str(b, "date") || str(b, "bookingDate");
    if (!created) continue;
    const age = daysPast(created, now);
    if (age >= 0 && age <= 30) {
      const id = `ntf-book-${b.id}`;
      out.push({
        id,
        kind: "booking_created",
        title: "Booking created",
        detail: `${b.id} · ${str(b, "customerName") || str(b, "customerId") || "customer"}`,
        entityType: "booking",
        entityId: b.id,
        href: `/bookings/${b.id}`,
        createdAt: created.length === 10 ? `${created}T12:00:00.000Z` : created,
        unread: !read.has(id),
      });
    }
  }

  for (const c of input.cancelRequests) {
    const status = str(c, "status").toLowerCase();
    if (status.includes("pending") || status.includes("request") || status === "open") {
      const id = `ntf-cancel-${c.id}`;
      out.push({
        id,
        kind: "cancellation_request",
        title: "Cancellation request",
        detail: `${c.id} awaiting decision`,
        entityType: "cancellation",
        entityId: c.id,
        href: "/bookings",
        createdAt: str(c, "requestedAt") || str(c, "createdAt") || now.toISOString(),
        unread: !read.has(id),
      });
    }
  }

  for (const r of input.opsResales) {
    const id = `ntf-resale-${r.id}`;
    out.push({
      id,
      kind: "resale_created",
      title: "Resale created",
      detail: `${r.id} listed`,
      entityType: "resale",
      entityId: r.id,
      href: "/resale",
      createdAt: str(r, "createdAt") || str(r, "listedAt") || now.toISOString(),
      unread: !read.has(id),
    });
  }

  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out;
}

export function deriveOperationalAudit(input: DeriveInput): AuditEvent[] {
  const rows: AuditEvent[] = [];

  for (const b of input.bookings) {
    const at = str(b, "bookedAt") || str(b, "createdAt") || str(b, "date") || str(b, "bookingDate");
    if (!at) continue;
    rows.push({
      id: `AUD-BOOK-${b.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: str(b, "agentId") || "system",
      actorEmail: str(b, "agentId") || "system",
      action: "booking.created",
      entityType: "booking",
      entityId: b.id,
      summary: `Booking ${b.id} recorded`,
      after: str(b, "stage") || str(b, "status") || "booked",
    });
  }

  for (const p of input.financePayments) {
    const at = str(p, "paidAt") || str(p, "createdAt") || str(p, "date");
    if (!at) continue;
    rows.push({
      id: `AUD-PAY-${p.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: str(p, "recordedBy") || "finance",
      actorEmail: str(p, "recordedBy") || "finance",
      action: "payment.recorded",
      entityType: "payment",
      entityId: p.id,
      summary: `Payment ${p.id} recorded`,
      after: String(p["amount"] ?? ""),
    });
  }

  for (const r of input.reservations) {
    const at = str(r, "reservedAt") || str(r, "createdAt") || str(r, "date");
    if (!at) continue;
    rows.push({
      id: `AUD-RES-${r.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: str(r, "agentId") || "system",
      actorEmail: str(r, "agentId") || "system",
      action: "reservation.created",
      entityType: "reservation",
      entityId: r.id,
      summary: `Reservation ${r.id}`,
      after: str(r, "status") || "active",
    });
  }

  for (const d of input.opsDocuments) {
    const at = str(d, "uploadedAt") || str(d, "createdAt") || str(d, "updatedAt");
    if (!at) continue;
    rows.push({
      id: `AUD-DOC-${d.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: "ops",
      actorEmail: "ops",
      action: "document.uploaded",
      entityType: "document",
      entityId: d.id,
      summary: `Document ${d.id}`,
      after: str(d, "status") || "uploaded",
    });
  }

  for (const reg of input.opsRegistrations) {
    const at = str(reg, "scheduledAt") || str(reg, "createdAt") || str(reg, "updatedAt");
    if (!at) continue;
    rows.push({
      id: `AUD-REG-${reg.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: "ops",
      actorEmail: "ops",
      action: "registration.updated",
      entityType: "registration",
      entityId: reg.id,
      summary: `Registration ${reg.id}`,
      after: str(reg, "status"),
    });
  }

  for (const rs of input.opsResales) {
    const at = str(rs, "createdAt") || str(rs, "listedAt");
    if (!at) continue;
    rows.push({
      id: `AUD-RS-${rs.id}`,
      at: at.length === 10 ? `${at}T12:00:00.000Z` : at,
      actorId: "ops",
      actorEmail: "ops",
      action: "resale.created",
      entityType: "resale",
      entityId: rs.id,
      summary: `Resale ${rs.id}`,
    });
  }

  rows.sort((a, b) => b.at.localeCompare(a.at));
  return rows;
}

export function filterByDate<T>(
  rows: T[],
  getDate: (r: T) => string | undefined,
  from?: string,
  to?: string,
): T[] {
  return rows.filter((r) => {
    const d = (getDate(r) || "").slice(0, 10);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}
