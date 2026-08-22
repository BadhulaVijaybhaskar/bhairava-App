import { cn } from "@/lib/utils";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import type { PlotStatus } from "@prisma/client";

const BOOKING_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
  RESERVED: { bg: "bg-amber-100", text: "text-amber-800", label: "Reserved" },
  BOOKED: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Booked" },
  AGREEMENT: { bg: "bg-orange-100", text: "text-orange-800", label: "Agreement" },
  PENDING_DOCS: { bg: "bg-red-100", text: "text-red-700", label: "Pending Docs" },
  UNDER_DOCUMENTATION: { bg: "bg-purple-100", text: "text-purple-800", label: "Under Doc" },
  SOLD: { bg: "bg-red-100", text: "text-red-800", label: "Sold" },
  REGISTERED: { bg: "bg-blue-100", text: "text-blue-800", label: "Registered" },
  CANCELLED: { bg: "bg-slate-200", text: "text-slate-700", label: "Cancelled" },
};

export function PlotStatusBadge({ status }: { status: PlotStatus }) {
  const meta = PLOT_STATUS_COLORS[status];
  return (
    <span className={cn("m-badge", meta.bg, meta.text)}>{meta.label}</span>
  );
}

export function BookingStatusBadge({ status }: { status: string }) {
  const meta = BOOKING_STATUS[status] ?? {
    bg: "bg-[var(--brand-light)]",
    text: "text-[var(--brand)]",
    label: status.replaceAll("_", " "),
  };
  return <span className={cn("m-badge", meta.bg, meta.text)}>{meta.label}</span>;
}

export function ProjectStatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE" || status === "PUBLISHED";
  return (
    <span
      className={cn(
        "m-badge",
        active ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-slate-100 text-slate-600",
      )}
    >
      {active ? "Active" : status.replaceAll("_", " ")}
    </span>
  );
}
