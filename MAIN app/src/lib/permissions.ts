import type { AppUser } from "@/lib/mock-data";

export type WorkspaceRole = AppUser["role"];

/** Role rank — higher can manage lower. Founder is top. */
const ROLE_RANK: Record<WorkspaceRole, number> = {
  Founder: 5,
  Administrator: 4,
  Sales: 3,
  Finance: 3,
  Viewer: 1,
};

export function roleRank(role: WorkspaceRole): number {
  return ROLE_RANK[role];
}

export function canManageUsers(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return false;
  return actor.role === "Founder" || actor.role === "Administrator";
}

export function canChangeRole(
  actor: AppUser | null | undefined,
  target: AppUser,
  nextRole: WorkspaceRole,
): { ok: boolean; reason?: string } {
  if (!canManageUsers(actor)) {
    return { ok: false, reason: "You do not have permission to change roles." };
  }
  if (!actor) return { ok: false, reason: "Not signed in." };

  if (target.role === "Founder" && actor.role !== "Founder") {
    return { ok: false, reason: "Only a Founder can change another Founder's role." };
  }

  if (nextRole === "Founder" && actor.role !== "Founder") {
    return { ok: false, reason: "Only a Founder can promote someone to Founder." };
  }

  if (actor.role === "Administrator" && roleRank(target.role) >= roleRank("Administrator")) {
    return { ok: false, reason: "Administrators cannot manage Founders or other Administrators." };
  }

  if (actor.role === "Administrator" && roleRank(nextRole) >= roleRank("Administrator")) {
    return { ok: false, reason: "Administrators cannot assign Founder or Administrator roles." };
  }

  return { ok: true };
}

export function canRemoveMember(
  actor: AppUser | null | undefined,
  target: AppUser,
  allUsers: AppUser[],
): { ok: boolean; reason?: string } {
  if (!canManageUsers(actor)) {
    return { ok: false, reason: "You do not have permission to remove members." };
  }
  if (!actor) return { ok: false, reason: "Not signed in." };

  if (actor.id === target.id) {
    return { ok: false, reason: "You cannot remove yourself from the workspace." };
  }

  if (target.role === "Founder") {
    const founders = allUsers.filter((u) => u.role === "Founder" && u.status !== "Invited");
    if (founders.length <= 1) {
      return { ok: false, reason: "Cannot remove the final Founder." };
    }
    if (actor.role !== "Founder") {
      return { ok: false, reason: "Only a Founder can remove another Founder." };
    }
  }

  if (actor.role === "Administrator" && roleRank(target.role) >= roleRank("Administrator")) {
    return { ok: false, reason: "Administrators cannot remove Founders or other Administrators." };
  }

  return { ok: true };
}

export function canDemoteFounder(
  actor: AppUser | null | undefined,
  target: AppUser,
  nextRole: WorkspaceRole,
  allUsers: AppUser[],
): { ok: boolean; reason?: string } {
  const base = canChangeRole(actor, target, nextRole);
  if (!base.ok) return base;

  if (target.role === "Founder" && nextRole !== "Founder") {
    const founders = allUsers.filter((u) => u.role === "Founder" && u.status !== "Invited");
    if (founders.length <= 1) {
      return { ok: false, reason: "Cannot demote the final Founder." };
    }
  }

  return { ok: true };
}

export function canEditCompany(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return false;
  return actor.role === "Founder" || actor.role === "Administrator";
}

export function canDeleteWorkspace(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return false;
  return actor.role === "Founder";
}

export function canMutateSales(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return false;
  return actor.role === "Founder" || actor.role === "Administrator" || actor.role === "Sales";
}

export function canMutateFinance(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return false;
  return actor.role === "Founder" || actor.role === "Administrator" || actor.role === "Finance";
}

export function isReadOnly(actor: AppUser | null | undefined): boolean {
  if (!actor || actor.status !== "Active") return true;
  return actor.role === "Viewer";
}

export function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? full;
}
