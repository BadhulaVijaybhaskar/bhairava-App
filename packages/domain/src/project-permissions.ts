/**
 * Project workspace permission gates (permission matrix §6 Setup / §7 Layout & Plots).
 * UI helpers simulate API/backend authorization — never UI-only security.
 */

export type AppRole =
  | "Founder"
  | "Administrator"
  | "Finance"
  | "Viewer"
  | "Agent"
  | "Customer"
  | "Sales"; // legacy AppUser role — treat as Agent-equivalent for Setup deny

export type SetupAccess = "full" | "read" | "denied";

/** Layout & Plots tab access — mirrors Setup matrix §7 (Agent = inventory VIEW, no master edit). */
export type LayoutAccess = "full" | "read" | "inventory" | "denied";

export function normalizeRole(raw: unknown): AppRole {
  if (typeof raw !== "string") return "Viewer";
  const s = raw.trim();
  switch (s) {
    case "Founder":
    case "Administrator":
    case "Finance":
    case "Viewer":
    case "Agent":
    case "Customer":
    case "Sales":
      return s;
    case "Admin":
      return "Administrator";
    default:
      return "Viewer";
  }
}

/** Map session / AppUser role to Setup tab access. */
export function setupAccessForRole(role: unknown): SetupAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance" || r === "Viewer") return "read";
  // Agent, Customer, Sales — no Setup access
  return "denied";
}

/**
 * Layout & Plots (§7):
 * Founder/Admin full; Finance/Viewer read; Agent inventory view (no master create/edit);
 * Customer denied in MAIN.
 */
export function layoutAccessForRole(role: unknown): LayoutAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance" || r === "Viewer") return "read";
  if (r === "Agent" || r === "Sales") return "inventory";
  return "denied";
}

export function canEditSetup(role: unknown): boolean {
  return setupAccessForRole(role) === "full";
}

export function canViewSetup(role: unknown): boolean {
  const a = setupAccessForRole(role);
  return a === "full" || a === "read";
}

export function canChangeLifecycle(role: unknown): boolean {
  return canEditSetup(role);
}

export function canChangePublishFlags(role: unknown): boolean {
  return canEditSetup(role);
}

export function canPriceOverride(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator";
}

export function canOpenProjectWorkspace(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "Founder" || r === "Administrator" || r === "Finance" || r === "Viewer" || r === "Sales";
}

export function canViewLayout(role: unknown): boolean {
  const a = layoutAccessForRole(role);
  return a === "full" || a === "read" || a === "inventory";
}

/** Create / edit plot master fields, polygon link, facing/area/corner/premiums. */
export function canEditPlotMaster(role: unknown): boolean {
  return layoutAccessForRole(role) === "full";
}

export function canCreatePlot(role: unknown): boolean {
  return canEditPlotMaster(role);
}

/** Commercial status change / block-unblock (ADMIN_MANUAL). */
export function canChangePlotStatus(role: unknown): boolean {
  return layoutAccessForRole(role) === "full";
}

export function canBlockPlot(role: unknown): boolean {
  return canChangePlotStatus(role);
}

export function canOverridePlotPrice(role: unknown): boolean {
  return canPriceOverride(role);
}

/** Sales tab: Founder/Admin full; Finance/Viewer read; Agent limited; Customer denied. */
export type SalesAccess = "full" | "read" | "limited" | "denied";

export function salesAccessForRole(role: unknown): SalesAccess {
  const r = normalizeRole(role);
  if (r === "Founder" || r === "Administrator") return "full";
  if (r === "Finance" || r === "Viewer") return "read";
  if (r === "Agent" || r === "Sales") return "limited";
  return "denied";
}

export function canEditSalesOps(role: unknown): boolean {
  return salesAccessForRole(role) === "full";
}

export function canViewSales(role: unknown): boolean {
  const a = salesAccessForRole(role);
  return a === "full" || a === "read" || a === "limited";
}

