import { PLOT_STATUS_COLORS } from "@/lib/constants";
import type { PlotStatus } from "@prisma/client";

const EXTRA: Record<string, { bg: string; text: string }> = {
  Paid: { bg: "#dcfce7", text: "#15803d" },
  Pending: { bg: "#ffedd5", text: "#c2410c" },
  Upcoming: { bg: "#dbeafe", text: "#1d4ed8" },
  "In Progress": { bg: "#ede9fe", text: "#6d28d9" },
  Completed: { bg: "#dcfce7", text: "#15803d" },
  Active: { bg: "#dcfce7", text: "#15803d" },
};

export function StatusBadge({
  status,
  label,
}: {
  status?: string;
  label?: string;
}) {
  const plot = status && (PLOT_STATUS_COLORS as Record<string, { bg: string; text: string; label: string }>)[status];
  const extra = status ? EXTRA[status] : undefined;
  const text = label || plot?.label || status || "";
  const style = plot
    ? undefined
    : extra
      ? { background: extra.bg, color: extra.text }
      : { background: "#f3f4f6", color: "#4b5563" };

  return (
    <span
      className={`m-badge ${plot ? `${plot.bg} ${plot.text}` : ""}`}
      style={style}
    >
      {text}
    </span>
  );
}

export function plotStatusLabel(status: PlotStatus) {
  return PLOT_STATUS_COLORS[status]?.label ?? status;
}
