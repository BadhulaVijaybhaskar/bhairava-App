import { describe, expect, it } from "vitest";
import {
  canAccessDangerZone,
  canAccessFounderBilling,
  canMutateManagement,
  canViewManagement,
  managementAccessForRole,
  roleHasPermission,
  inviteMember,
  updateMemberRole,
  filterAuditEvents,
  appendAuditEvent,
  normalizeCompanySettings,
  buildManagementDemoSeed,
  dangerZoneAllowed,
} from "../management";

describe("management access", () => {
  it("Founder full; Admin admin; others read/denied; billing+danger Founder-only", () => {
    expect(managementAccessForRole("Founder")).toBe("full");
    expect(managementAccessForRole("Administrator")).toBe("admin");
    expect(managementAccessForRole("Viewer")).toBe("read");
    expect(managementAccessForRole("Customer")).toBe("denied");
    expect(canViewManagement("Finance")).toBe(true);
    expect(canMutateManagement("Administrator")).toBe(true);
    expect(canMutateManagement("Viewer")).toBe(false);
    expect(canAccessFounderBilling("Founder")).toBe(true);
    expect(canAccessFounderBilling("Administrator")).toBe(false);
    expect(canAccessDangerZone("Founder")).toBe(true);
    expect(canAccessDangerZone("Administrator")).toBe(false);
    expect(dangerZoneAllowed("Founder", "reset_demo_data")).toBe(true);
    expect(dangerZoneAllowed("Administrator", "reset_demo_data")).toBe(false);
  });

  it("role permission matrix", () => {
    expect(roleHasPermission("Founder", "billing.view")).toBe(true);
    expect(roleHasPermission("Administrator", "billing.view")).toBe(false);
    expect(roleHasPermission("Agent", "sales.operate")).toBe(true);
    expect(roleHasPermission("Customer", "projects.view")).toBe(false);
  });
});

describe("members + audit + company", () => {
  it("invite + role update", () => {
    const invited = inviteMember([], {
      email: "new.agent@bhairava.com",
      role: "Agent",
      actorId: "admin",
    });
    expect(invited.ok).toBe(true);
    if (!invited.ok) return;
    expect(invited.member.status).toBe("Invited");
    const updated = updateMemberRole(invited.list, invited.member.id, "Sales");
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.list[0]!.role).toBe("Sales");
  });

  it("audit append + filter; company normalize; seed", () => {
    const log = appendAuditEvent([], {
      actorId: "U1",
      actorEmail: "admin@bhairava.com",
      action: "member.invite",
      entityType: "member",
      entityId: "USR-1",
      summary: "Invited new.agent@bhairava.com",
    });
    expect(log).toHaveLength(1);
    expect(filterAuditEvents(log, { action: "member.invite" })).toHaveLength(1);
    expect(filterAuditEvents(log, { action: "other" })).toHaveLength(0);
    const company = normalizeCompanySettings({ tradeName: "Bhairava Homes" });
    expect(company.tradeName).toBe("Bhairava Homes");
    expect(company.legalName).toContain("Bhairava");
    const seed = buildManagementDemoSeed({
      appUsers: [{ id: "U1", name: "Admin", email: "admin@bhairava.com", role: "Administrator" }],
      auditLog: [{ time: "2026-09-20T10:00:00Z", actor: "admin@bhairava.com", action: "login", detail: "ok" }],
    });
    expect(seed.members).toHaveLength(1);
    expect(seed.auditEvents).toHaveLength(1);
    expect(seed.billing.planName).toBeTruthy();
  });
});
