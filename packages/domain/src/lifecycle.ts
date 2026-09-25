/**
 * Project lifecycle vs publish visibility (Portfolio OS §11).
 * PUBLISHED is NOT a lifecycle status — use agentVisible / customerListed flags.
 */

export const LIFECYCLE_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type ProjectLifecycle = (typeof LIFECYCLE_STATUSES)[number];

/** Legacy Project.status strings from mock-data / older localStorage. */
export type LegacyProjectStatus =
  | "Draft"
  | "Pre-launch"
  | "Active"
  | "Sold out"
  | "On hold"
  | "Inactive";

/**
 * Map legacy project.status → lifecycle.
 * Inactive → ARCHIVED (conservative soft-end; do not delete records).
 * Pre-launch → DRAFT (setup incomplete / not sold against) unless caller overrides.
 */
export function legacyProjectStatusToLifecycle(raw: unknown): ProjectLifecycle {
  if (typeof raw === "string" && (LIFECYCLE_STATUSES as readonly string[]).includes(raw)) {
    return raw as ProjectLifecycle;
  }
  const s = typeof raw === "string" ? raw.trim() : "";
  switch (s) {
    case "Draft":
    case "DRAFT":
      return "DRAFT";
    case "Pre-launch":
      return "DRAFT";
    case "Active":
    case "ACTIVE":
      return "ACTIVE";
    case "On hold":
    case "ON_HOLD":
      return "ON_HOLD";
    case "Sold out":
    case "COMPLETED":
      return "COMPLETED";
    case "Inactive":
    case "ARCHIVED":
      return "ARCHIVED"; // conservative soft-end; never discard
    default:
      return "DRAFT";
  }
}

/** Display chip for legacy Project.status column still shown in list screens. */
export function lifecycleToLegacyStatusLabel(lifecycle: ProjectLifecycle): LegacyProjectStatus {
  switch (lifecycle) {
    case "DRAFT":
      return "Draft";
    case "ACTIVE":
      return "Active";
    case "ON_HOLD":
      return "On hold";
    case "COMPLETED":
      return "Sold out";
    case "ARCHIVED":
      return "Inactive";
  }
}

export const LIFECYCLE_LABEL: Record<ProjectLifecycle, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export interface ProjectVisibility {
  agentVisible: boolean;
  customerListed: boolean;
}

/** DRAFT forces both publish flags off. */
export function enforceVisibilityForLifecycle(
  lifecycle: ProjectLifecycle,
  flags: ProjectVisibility,
): ProjectVisibility {
  if (lifecycle === "DRAFT") {
    return { agentVisible: false, customerListed: false };
  }
  if (lifecycle === "COMPLETED" || lifecycle === "ARCHIVED") {
    return {
      agentVisible: flags.agentVisible,
      customerListed: false, // off by default for completed/archived
    };
  }
  return {
    agentVisible: !!flags.agentVisible,
    customerListed: !!flags.customerListed,
  };
}
