import type { PlotStatus } from "@prisma/client";

export const PLOT_STATUS_COLORS: Record<PlotStatus, { bg: string; text: string; hex: string; label: string }> = {
  AVAILABLE: { bg: "bg-emerald-50", text: "text-emerald-700", hex: "#10B981", label: "Available" },
  RESERVED: { bg: "bg-amber-50", text: "text-amber-700", hex: "#F59E0B", label: "Reserved" },
  BOOKED: { bg: "bg-yellow-50", text: "text-yellow-700", hex: "#FACC15", label: "Booked" },
  UNDER_DOCUMENTATION: { bg: "bg-purple-50", text: "text-purple-700", hex: "#8B5CF6", label: "Under Doc" },
  SOLD: { bg: "bg-red-50", text: "text-red-700", hex: "#EF4444", label: "Sold" },
  REGISTERED: { bg: "bg-blue-50", text: "text-blue-700", hex: "#2563EB", label: "Registered" },
  RESALE_AVAILABLE: { bg: "bg-orange-50", text: "text-orange-700", hex: "#D97706", label: "Resale" },
  BLOCKED: { bg: "bg-[var(--surface-low)]", text: "text-muted-foreground", hex: "#64748B", label: "Blocked" },
  CANCELLED: { bg: "bg-[var(--surface-container)]", text: "text-foreground", hex: "#64748B", label: "Cancelled" },
};

export const BRAND = {
  name: "Bhairava Real Estate",
  primary: "#002444",
  primaryDark: "#001a33",
  primaryLight: "#EDF4F8",
  canvas: "#f9f9f6",
};
