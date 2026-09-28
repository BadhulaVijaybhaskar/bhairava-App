import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getSession, setSessionRole } from "@/lib/auth";
import { useManagement } from "@/lib/management-store";
import {
  MAIN_MEMBER_ROLES,
  MATRIX_MODULES,
  PERMISSION_MATRIX,
  matrixCellLabel,
  memberStatusLabel,
  type MainMemberRole,
  type ManagedMemberP6,
} from "@/lib/domain/management-p6";
import type { AppRole } from "@/lib/domain/project-permissions";
import { canAccessDangerZone, canAccessFounderBilling } from "@/lib/domain/management";

export const Route = createFileRoute("/settings/users")({
  head: () => ({
    meta: [
      { title: "Members & Roles — Bhairava" },
      { name: "description", content: "Manage team members, roles and access across the Bhairava workspace." },
    ],
  }),
  component: UsersSettings,
});

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function UsersSettings() {
  const session = getSession();
  const mgmt = useManagement();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<MainMemberRole>("Viewer");
  const [msg, setMsg] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const visible = useMemo(() => mgmt.members.filter((m) => m.statusV2 !== "revoked"), [mgmt.members]);

  function run(result: { ok: true } | { ok: false; error: string }, okMsg: string) {
    setMsg(result.ok ? okMsg : result.error);
    if (result.ok) setMenuFor(null);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Members & roles"
        description="Fixed MAIN roles (Founder, Administrator, Finance, Viewer). Agent seats live in MAIN-agent."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          <Panel data-testid="members-panel">
            <SectionTitle aside={`${visible.length} members`}>Team members</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="rounded-l-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Member</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Role</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Last login</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Joined</th>
                    <th className="rounded-r-lg px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 1 ? "bg-surface/60" : ""} data-testid={`member-row-${u.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">{initials(u.name)}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {mgmt.canMutate ? (
                          <select
                            className="rounded-lg bg-surface-low px-2.5 py-1.5 text-xs font-medium outline-none"
                            value={u.role}
                            data-testid={`member-role-${u.id}`}
                            onChange={(e) => run(mgmt.setRole(u.id, e.target.value as AppRole), `Role updated for ${u.email}`)}
                          >
                            {MAIN_MEMBER_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded-lg bg-surface-low px-2.5 py-1.5 text-xs font-medium">{u.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><Chip>{memberStatusLabel(u.statusV2)}</Chip></td>
                      <td className="px-4 py-3"><span className="numeric text-xs text-muted-foreground">{u.lastLogin ?? "—"}</span></td>
                      <td className="px-4 py-3"><span className="numeric text-xs text-muted-foreground">{u.joinedAt ?? u.invitedAt ?? "—"}</span></td>
                      <td className="relative px-4 py-3 text-right">
                        {mgmt.canMutate && (
                          <>
                            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-low" data-testid={`member-menu-${u.id}`} onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}>
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuFor === u.id && (
                              <div className="absolute right-4 z-20 mt-1 w-40 rounded-lg border border-border bg-background p-1 shadow-lg">
                                {u.statusV2 === "invited" && <button className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-low" onClick={() => run(mgmt.resend(u.id), `Invite resent`)}>Resend invite</button>}
                                {u.statusV2 === "active" && <button className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-low" data-testid={`member-suspend-${u.id}`} onClick={() => run(mgmt.suspend(u.id), `Suspended`)}>Suspend</button>}
                                {u.statusV2 === "suspended" && <button className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-low" onClick={() => run(mgmt.reactivate(u.id), `Reactivated`)}>Reactivate</button>}
                                {u.statusV2 !== "revoked" && u.role !== "Founder" && <button className="block w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-surface-low" onClick={() => run(mgmt.revoke(u.id), `Revoked`)}>Revoke</button>}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mgmt.canMutate && (
              <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-surface-low p-3">
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name (optional)" className="h-9 min-w-[140px] rounded-lg bg-surface-c px-3 text-sm outline-none focus:ring-2 focus:ring-primary" data-testid="invite-name" />
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@bhairava.com" className="h-9 min-w-[220px] flex-1 rounded-lg bg-surface-c px-3 text-sm outline-none focus:ring-2 focus:ring-primary" data-testid="invite-email" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as MainMemberRole)} className="h-9 rounded-lg bg-surface-c px-3 text-sm outline-none focus:ring-2 focus:ring-primary" data-testid="invite-role">
                  {MAIN_MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Btn variant="primary" data-testid="invite-submit" onClick={() => {
                  const res = mgmt.invite({ email: inviteEmail, role: inviteRole, ...(inviteName.trim() ? { name: inviteName.trim() } : {}) });
                  if (res.ok) { setInviteEmail(""); setInviteName(""); setMsg(`Invited ${inviteEmail}`); }
                  else setMsg(res.error);
                }}>
                  <Plus className="h-4 w-4" /> Invite member
                </Btn>
              </div>
            )}
            {msg && <p className="mt-3 text-sm" data-testid="members-msg">{msg}</p>}
          </Panel>

          <Panel tonal data-testid="permission-matrix">
            <SectionTitle>Roles & permissions</SectionTitle>
            <p className="pb-3 text-xs text-muted-foreground">Fixed-role matrix. Billing and Danger Zone are Founder-only.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="px-3 py-2 text-left">Module</th>
                    {MAIN_MEMBER_ROLES.map((r) => <th key={r} className="px-3 py-2 text-left">{r}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_MODULES.map((mod) => (
                    <tr key={mod}>
                      <td className="px-3 py-2 font-medium">{mod}</td>
                      {MAIN_MEMBER_ROLES.map((r) => {
                        const cell = PERMISSION_MATRIX[r][mod];
                        return (
                          <td key={r} className={cell === "founder" ? "px-3 py-2 font-medium text-amber-700" : cell === "none" ? "px-3 py-2 text-muted-foreground" : "px-3 py-2"} data-founder-only={cell === "founder" ? "true" : undefined}>
                            {matrixCellLabel(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel data-testid="demo-role-switch">
            <SectionTitle>Demo role switch</SectionTitle>
            <p className="pb-3 text-xs text-muted-foreground">
              Session: <strong>{session?.role ?? "—"}</strong>
              {" · "}{canAccessFounderBilling(session?.role) ? "Billing OK" : "Billing denied"}
              {" · "}{canAccessDangerZone(session?.role) ? "Danger OK" : "Danger denied"}
            </p>
            <div className="flex flex-wrap gap-2">
              {MAIN_MEMBER_ROLES.map((r) => (
                <Btn key={r} variant={session?.role === r ? "primary" : "tonal"} data-testid={`switch-role-${r}`} onClick={() => { setSessionRole(r); window.location.reload(); }}>{r}</Btn>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
