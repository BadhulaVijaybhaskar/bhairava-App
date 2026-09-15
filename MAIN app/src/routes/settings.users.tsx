import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, SectionTitle, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import type { AppUser } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import {
  canChangeRole,
  canDemoteFounder,
  canManageUsers,
  canRemoveMember,
  firstName,
} from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/settings/users")({
  head: () => ({
    meta: [
      { title: "Members & Roles — Bhairava" },
      {
        name: "description",
        content: "Manage team members, roles and access across the Bhairava workspace.",
      },
      { property: "og:title", content: "Members & Roles — Bhairava" },
      {
        property: "og:description",
        content: "Manage team members, roles and access across the Bhairava workspace.",
      },
    ],
  }),
  component: UsersSettings,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const roles: AppUser["role"][] = ["Founder", "Administrator", "Sales", "Finance", "Viewer"];

type ConfirmKind = "remove" | "suspend" | "revoke" | null;

function UsersSettings() {
  const {
    workspaceUsers,
    currentUser,
    inviteUser,
    updateUserRole,
    updateUserStatus,
    removeUser,
    resendInvitation,
    revokeInvitation,
  } = useData();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppUser["role"]>("Sales");
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [roleTarget, setRoleTarget] = useState<AppUser | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; user: AppUser } | null>(null);

  const canManage = canManageUsers(currentUser);
  const memberCount = workspaceUsers.length;

  const roleOptions = useMemo(() => {
    if (!roleTarget || !currentUser) return [];
    return roles.map((r) => {
      const check = canDemoteFounder(currentUser, roleTarget, r, workspaceUsers);
      return { role: r, ...check };
    });
  }, [roleTarget, currentUser, workspaceUsers]);

  const onInvite = () => {
    setInviteError(null);
    const result = inviteUser(inviteEmail, inviteRole);
    if (!result.ok) {
      setInviteError(result.error ?? "Could not send invitation.");
      toast.error(result.error ?? "Could not send invitation.");
      return;
    }
    toast.success(`Invitation sent to ${inviteEmail.trim().toLowerCase()}`);
    setInviteEmail("");
    setInviteRole("Sales");
  };

  const applyRole = (role: AppUser["role"]) => {
    if (!roleTarget) return;
    const result = updateUserRole(roleTarget.id, role);
    if (!result.ok) {
      toast.error(result.error ?? "Could not update role.");
      return;
    }
    toast.success(`${roleTarget.name}'s role updated to ${role}`);
    setRoleTarget(null);
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    if (kind === "remove") {
      const result = removeUser(user.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not remove member.");
      } else {
        toast.success(`${user.name} removed from workspace`);
      }
    } else if (kind === "suspend") {
      const result = updateUserStatus(user.id, "Suspended");
      if (!result.ok) {
        toast.error(result.error ?? "Could not suspend member.");
      } else {
        toast.success(`${user.name} suspended`);
      }
    } else if (kind === "revoke") {
      const result = revokeInvitation(user.id);
      if (!result.ok) {
        toast.error(result.error ?? "Could not revoke invitation.");
      } else {
        toast.success(`Invitation to ${user.email} revoked`);
      }
    }
    setConfirm(null);
  };

  const confirmCopy = (() => {
    if (!confirm) return { title: "", body: "", action: "" };
    const n = firstName(confirm.user.name);
    if (confirm.kind === "remove") {
      return {
        title: `Remove ${confirm.user.name}?`,
        body: `${n} will immediately lose access to this workspace.`,
        action: "Remove member",
      };
    }
    if (confirm.kind === "suspend") {
      return {
        title: `Suspend ${confirm.user.name}?`,
        body: `${n} will lose access until reactivated.`,
        action: "Suspend member",
      };
    }
    return {
      title: `Revoke invitation for ${confirm.user.email}?`,
      body: "They will no longer be able to join with this invitation.",
      action: "Revoke invitation",
    };
  })();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Members & roles"
        description="Control who has access to the Bhairava workspace and what they can do."
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />

        <div className="min-w-0 flex-1 space-y-6">
          <Panel>
            <SectionTitle aside={`${memberCount} members`}>Team members</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="rounded-l-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      Member
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      Role
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                      Last active
                    </th>
                    <th className="rounded-r-lg px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {workspaceUsers.map((u, i) => {
                    const removeGate = canRemoveMember(currentUser, u, workspaceUsers);
                    const roleGate = canChangeRole(currentUser, u, u.role);
                    return (
                      <tr key={u.id} className={i % 2 === 1 ? "bg-surface/60" : ""}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                              {initials(u.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {u.name}
                                {currentUser?.id === u.id ? (
                                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                    (you)
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!canManage || !roleGate.ok}
                            title={!roleGate.ok ? roleGate.reason : "Change role"}
                            onClick={() => setRoleTarget(u)}
                            className="flex items-center gap-1.5 rounded-lg bg-surface-low px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {u.role}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Chip>{u.status}</Chip>
                        </td>
                        <td className="px-4 py-3">
                          <span className="numeric text-xs text-muted-foreground">
                            {u.lastActive}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for ${u.name}`}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-low hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                disabled={!canManage || !roleGate.ok}
                                onClick={() => setRoleTarget(u)}
                              >
                                Change role
                              </DropdownMenuItem>

                              {u.status === "Active" && (
                                <DropdownMenuItem
                                  disabled={!canManage || !removeGate.ok}
                                  onClick={() => setConfirm({ kind: "suspend", user: u })}
                                >
                                  Suspend member
                                </DropdownMenuItem>
                              )}
                              {u.status === "Suspended" && (
                                <DropdownMenuItem
                                  disabled={!canManage}
                                  onClick={() => {
                                    const result = updateUserStatus(u.id, "Active");
                                    if (!result.ok)
                                      toast.error(result.error ?? "Could not reactivate.");
                                    else toast.success(`${u.name} reactivated`);
                                  }}
                                >
                                  Reactivate member
                                </DropdownMenuItem>
                              )}
                              {u.status === "Invited" && (
                                <>
                                  <DropdownMenuItem
                                    disabled={!canManage}
                                    onClick={() => {
                                      const result = resendInvitation(u.id);
                                      if (!result.ok)
                                        toast.error(result.error ?? "Could not resend.");
                                      else toast.success(`Invitation resent to ${u.email}`);
                                    }}
                                  >
                                    Resend invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={!canManage}
                                    onClick={() => setConfirm({ kind: "revoke", user: u })}
                                  >
                                    Revoke invitation
                                  </DropdownMenuItem>
                                </>
                              )}

                              {u.status !== "Invited" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={!removeGate.ok}
                                    title={removeGate.reason}
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirm({ kind: "remove", user: u })}
                                  >
                                    Remove from workspace
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!removeGate.ok && u.status !== "Invited" && (
                                <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
                                  {removeGate.reason}
                                </p>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-2 rounded-xl bg-surface-low p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                  }}
                  placeholder="teammate@bhairava.in"
                  disabled={!canManage}
                  className="h-9 min-w-[220px] flex-1 rounded-lg bg-surface-c px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:opacity-60"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppUser["role"])}
                  disabled={!canManage}
                  className="h-9 rounded-lg bg-surface-c px-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                >
                  {roles
                    .filter((r) => {
                      if (!currentUser) return false;
                      if (currentUser.role === "Founder") return true;
                      return r !== "Founder" && r !== "Administrator";
                    })
                    .map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                </select>
                <Btn variant="primary" disabled={!canManage} onClick={onInvite}>
                  <Plus className="h-4 w-4" /> Invite member
                </Btn>
              </div>
              {inviteError && <p className="px-1 text-xs text-destructive">{inviteError}</p>}
              {!canManage && (
                <p className="px-1 text-xs text-muted-foreground">
                  Only Founders and Administrators can invite or manage members.
                </p>
              )}
            </div>
          </Panel>

          <Panel tonal>
            <SectionTitle>Roles explained</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  role: "Founder",
                  desc: "Full access to every workspace, billing and danger-zone actions.",
                },
                {
                  role: "Administrator",
                  desc: "Manage projects, users and settings, excluding billing.",
                },
                {
                  role: "Sales",
                  desc: "Create bookings, reservations and manage assigned customers.",
                },
                { role: "Finance", desc: "View and reconcile payments, collections and reports." },
                { role: "Viewer", desc: "Read-only access across projects and reports." },
              ].map((r) => (
                <div key={r.role} className="rounded-lg bg-surface p-3">
                  <p className="text-sm font-medium">{r.role}</p>
                  <p className="pt-1 text-xs text-muted-foreground">{r.desc}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              {roleTarget ? `Select a new role for ${roleTarget.name}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.role}
                type="button"
                disabled={!opt.ok}
                title={opt.reason}
                onClick={() => applyRole(opt.role)}
                className={`rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  roleTarget?.role === opt.role
                    ? "bg-primary/12 font-medium text-primary"
                    : "bg-surface-low hover:bg-surface-c"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="block">{opt.role}</span>
                {!opt.ok && opt.reason ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {opt.reason}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setRoleTarget(null)}>
              Cancel
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={runConfirm}
            >
              {confirmCopy.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
