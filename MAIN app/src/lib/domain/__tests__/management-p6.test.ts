import { describe, expect, it } from "vitest";
import {
  MAIN_MEMBER_ROLES,
  PERMISSION_MATRIX,
  inviteMemberP6,
  membersFromLegacy,
  suspendMemberP6,
  reactivateMemberP6,
  revokeMemberP6,
  resendInviteP6,
  updateMemberRoleP6,
  archiveProjectRecord,
  restoreProjectRecord,
  normalizeCompanySettingsP6,
  matrixCellLabel,
} from "../management-p6";
import { canAccessDangerZone, canAccessFounderBilling, canMutateManagement } from "../management";
import { deriveInAppNotifications, deriveOperationalAudit, toCsv } from "../management-derive";

describe("P6 members lifecycle", () => {
  it("invite → role → suspend → reactivate → revoke", () => {
    const invited = inviteMemberP6([], {
      email: "new.finance@bhairava.com",
      role: "Finance",
      actorEmail: "admin@bhairava.com",
    });
    expect(invited.ok).toBe(true);
    if (!invited.ok) return;
    expect(invited.member.statusV2).toBe("invited");

    const role = updateMemberRoleP6(invited.list, invited.member.id, "Viewer", "Administrator");
    expect(role.ok).toBe(true);
    if (!role.ok) return;

    const suspended = suspendMemberP6(role.list, invited.member.id);
    expect(suspended.ok).toBe(true);
    if (!suspended.ok) return;
    expect(suspended.list[0]!.statusV2).toBe("suspended");

    const active = reactivateMemberP6(suspended.list, invited.member.id);
    expect(active.ok).toBe(true);
    if (!active.ok) return;
    expect(active.list[0]!.statusV2).toBe("active");

    const revoked = revokeMemberP6(active.list, invited.member.id);
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) return;
    expect(revoked.list[0]!.statusV2).toBe("revoked");
  });

  it("resend invite only for invited", () => {
    const invited = inviteMemberP6([], {
      email: "viewer@bhairava.com",
      role: "Viewer",
      actorEmail: "admin@bhairava.com",
    });
    expect(invited.ok).toBe(true);
    if (!invited.ok) return;
    const resent = resendInviteP6(invited.list, invited.member.id);
    expect(resent.ok).toBe(true);
  });

  it("permission matrix marks billing/danger Founder-only", () => {
    expect(MAIN_MEMBER_ROLES).toContain("Founder");
    expect(PERMISSION_MATRIX.Founder.Billing).toBe("founder");
    expect(PERMISSION_MATRIX.Administrator.Billing).toBe("none");
    expect(matrixCellLabel("founder")).toMatch(/Founder/i);
    expect(canAccessFounderBilling("Founder")).toBe(true);
    expect(canAccessFounderBilling("Administrator")).toBe(false);
    expect(canAccessDangerZone("Founder")).toBe(true);
    expect(canMutateManagement("Viewer")).toBe(false);
  });
});

describe("P6 company + archive + derive", () => {
  it("normalizes company settings and archives with reason", () => {
    const company = normalizeCompanySettingsP6({ tradeName: "Bhairava Homes", defaultReservationDays: 10 });
    expect(company.tradeName).toBe("Bhairava Homes");
    expect(company.defaultReservationDays).toBe(10);

    const archived = archiveProjectRecord([], {
      entityId: "PRJ-1",
      entityLabel: "Demo Project",
      actorEmail: "founder@bhairava.com",
      reason: "Seasonal hold",
    });
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    const restored = restoreProjectRecord(archived.archives, archived.archives[0]!.id, "founder@bhairava.com");
    expect(restored.ok).toBe(true);
  });

  it("derives notifications/audit from real rows and exports csv", () => {
    const notifs = deriveInAppNotifications({
      bookings: [{ id: "BK-1", bookedAt: new Date().toISOString(), customerName: "Asha" }],
      reservations: [{ id: "RSV-1", status: "Active", expiresAt: new Date(Date.now() + 86400000).toISOString() }],
      cancelRequests: [],
      financePayments: [],
      paymentSchedules: [{ id: "SCH-1", dueDate: new Date(Date.now() - 86400000).toISOString(), status: "Due" }],
      opsDocuments: [{ id: "DOC-1", status: "pending" }],
      opsRegistrations: [],
      opsResales: [{ id: "RS-1", createdAt: new Date().toISOString() }],
      readIds: [],
    });
    expect(notifs.length).toBeGreaterThan(0);

    const audit = deriveOperationalAudit({
      bookings: [{ id: "BK-1", bookedAt: "2026-09-01", agentId: "AG-1", status: "Booked" }],
      reservations: [],
      cancelRequests: [],
      financePayments: [{ id: "PAY-1", paidAt: "2026-09-02", amount: 1000 }],
      paymentSchedules: [],
      opsDocuments: [],
      opsRegistrations: [],
      opsResales: [],
    });
    expect(audit.some((a) => a.action === "booking.created")).toBe(true);
    expect(toCsv(["a", "b"], [[1, 2]])).toContain("a,b");
    expect(membersFromLegacy([]).length).toBe(0);
  });
});
