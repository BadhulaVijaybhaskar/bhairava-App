import type { BookingStatus, PlotStatus } from "@prisma/client";

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  RESERVED: "Reserved",
  BOOKED: "Booked",
  AGREEMENT: "Agreement",
  PENDING_DOCS: "Pending docs",
  UNDER_DOCUMENTATION: "Under documentation",
  SOLD: "Sold",
  REGISTERED: "Registered",
  CANCELLED: "Cancelled",
};

export const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  DRAFT: "bg-[var(--surface-low)] text-foreground",
  RESERVED: "bg-amber-100 text-amber-800",
  BOOKED: "bg-sky-100 text-sky-800",
  AGREEMENT: "bg-indigo-100 text-indigo-800",
  PENDING_DOCS: "bg-orange-100 text-orange-800",
  UNDER_DOCUMENTATION: "bg-violet-100 text-violet-800",
  SOLD: "bg-emerald-100 text-emerald-800",
  REGISTERED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-red-100 text-red-800",
};

/** Plot statuses that can accept a new booking */
export const BOOKABLE_PLOT_STATUSES: PlotStatus[] = ["AVAILABLE", "RESERVED", "RESALE_AVAILABLE"];

export function plotStatusForBooking(status: BookingStatus): PlotStatus | null {
  switch (status) {
    case "DRAFT":
      return null;
    case "RESERVED":
      return "RESERVED";
    case "BOOKED":
      return "BOOKED";
    case "AGREEMENT":
    case "PENDING_DOCS":
    case "UNDER_DOCUMENTATION":
      return "UNDER_DOCUMENTATION";
    case "SOLD":
      return "SOLD";
    case "REGISTERED":
      return "REGISTERED";
    case "CANCELLED":
      return "AVAILABLE";
    default:
      return null;
  }
}

export function nextBookingStatuses(current: BookingStatus): BookingStatus[] {
  const flow: BookingStatus[] = [
    "RESERVED",
    "BOOKED",
    "AGREEMENT",
    "PENDING_DOCS",
    "UNDER_DOCUMENTATION",
    "SOLD",
    "REGISTERED",
  ];
  if (current === "CANCELLED" || current === "DRAFT") return ["RESERVED", "BOOKED"];
  const idx = flow.indexOf(current);
  const next = idx >= 0 ? flow.slice(idx + 1, idx + 3) : [];
  return [...next, "CANCELLED" as BookingStatus].filter((s) => s !== current);
}
