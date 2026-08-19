import type { PlotStatus } from "@prisma/client";

export const PLOT_STATUS_COLORS: Record<
  PlotStatus,
  { bg: string; text: string; hex: string; label: string }
> = {
  AVAILABLE: { bg: "bg-emerald-100", text: "text-emerald-800", hex: "#22C55E", label: "Available" },
  RESERVED: { bg: "bg-amber-100", text: "text-amber-800", hex: "#F59E0B", label: "Reserved" },
  BOOKED: { bg: "bg-yellow-100", text: "text-yellow-800", hex: "#EAB308", label: "Booked" },
  UNDER_DOCUMENTATION: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    hex: "#A855F7",
    label: "Under Doc",
  },
  SOLD: { bg: "bg-red-100", text: "text-red-800", hex: "#EF4444", label: "Sold" },
  REGISTERED: { bg: "bg-blue-100", text: "text-blue-800", hex: "#3B82F6", label: "Registered" },
  RESALE_AVAILABLE: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    hex: "#F97316",
    label: "Resale",
  },
  BLOCKED: { bg: "bg-slate-200", text: "text-slate-700", hex: "#94A3B8", label: "Blocked" },
  CANCELLED: { bg: "bg-slate-300", text: "text-slate-800", hex: "#64748B", label: "Cancelled" },
};
