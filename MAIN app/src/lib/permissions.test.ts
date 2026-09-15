import { describe, expect, it } from "vitest";
import {
  canChangeRole,
  canDemoteFounder,
  canManageUsers,
  canRemoveMember,
  canDeleteWorkspace,
  isReadOnly,
} from "@/lib/permissions";
import { validateInvite } from "@/lib/store";
import type { AppUser } from "@/lib/mock-data";
import { defaultCompanySettings } from "@/lib/company";

const founder = (over: Partial<AppUser> = {}): AppUser => ({
  id: "USR-01",
  name: "Vijay Bhaskar",
  email: "vijay@bhairava.in",
  role: "Founder",
  status: "Active",
  lastActive: "now",
  ...over,
});

const admin = (over: Partial<AppUser> = {}): AppUser => ({
  id: "USR-02",
  name: "Ramesh Iyer",
  email: "ramesh@bhairava.in",
  role: "Administrator",
  status: "Active",
  lastActive: "now",
  ...over,
});

const sales = (over: Partial<AppUser> = {}): AppUser => ({
  id: "USR-03",
  name: "Kavya Rao",
  email: "kavya@bhairava.in",
  role: "Sales",
  status: "Active",
  lastActive: "now",
  ...over,
});

describe("permissions", () => {
  it("allows founders and admins to manage users", () => {
    expect(canManageUsers(founder())).toBe(true);
    expect(canManageUsers(admin())).toBe(true);
    expect(canManageUsers(sales())).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });

  it("blocks self-removal and final founder removal", () => {
    const users = [founder(), admin()];
    expect(canRemoveMember(founder(), founder(), users).ok).toBe(false);
    expect(canRemoveMember(admin(), founder(), users).ok).toBe(false);
    expect(canRemoveMember(founder(), admin(), users).ok).toBe(true);
  });

  it("blocks demotion of the final founder", () => {
    const users = [founder(), admin()];
    expect(canDemoteFounder(founder(), founder(), "Administrator", users).ok).toBe(false);
    const twoFounders = [
      founder(),
      founder({ id: "USR-09", email: "other@bhairava.in", name: "Other" }),
      admin(),
    ];
    expect(canDemoteFounder(founder(), twoFounders[1]!, "Administrator", twoFounders).ok).toBe(
      true,
    );
  });

  it("prevents administrators from promoting to founder", () => {
    expect(canChangeRole(admin(), sales(), "Founder").ok).toBe(false);
    expect(canChangeRole(founder(), sales(), "Founder").ok).toBe(true);
  });

  it("restricts workspace delete to founders", () => {
    expect(canDeleteWorkspace(founder())).toBe(true);
    expect(canDeleteWorkspace(admin())).toBe(false);
  });

  it("marks viewers read-only", () => {
    expect(isReadOnly(sales({ role: "Viewer" }))).toBe(true);
    expect(isReadOnly(founder())).toBe(false);
  });
});

describe("validateInvite", () => {
  const users = [founder(), admin(), sales({ status: "Invited", email: "pending@bhairava.in" })];

  it("requires a valid unique email", () => {
    expect(validateInvite("", "Sales", users).ok).toBe(false);
    expect(validateInvite("not-an-email", "Sales", users).ok).toBe(false);
    expect(validateInvite("vijay@bhairava.in", "Sales", users).ok).toBe(false);
    expect(validateInvite("pending@bhairava.in", "Sales", users).ok).toBe(false);
    expect(validateInvite("new@bhairava.in", "Sales", users).ok).toBe(true);
  });
});

describe("company defaults", () => {
  it("seeds a complete company profile", () => {
    const s = defaultCompanySettings();
    expect(s.companyName).toContain("Bhairava");
    expect(s.reservationValidityDays).toBeGreaterThan(0);
    expect(s.notifyNewBooking).toBe(true);
  });
});
