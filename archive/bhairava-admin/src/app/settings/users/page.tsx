"use client";
import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { appUsers, type AppUser } from "@/lib/mock-data";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const roles: AppUser["role"][] = ["Founder", "Administrator", "Sales", "Finance", "Viewer"];

export default function UsersSettings() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppUser["role"]>("Sales");

  return (
    <AppShell>
      <PageHeader eyebrow="Settings" title="Members & roles" description="Control who has access to the Bhairava workspace and what they can do." />

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />

        <div className="min-w-0 flex-1 space-y-6">
          <Panel>
            <SectionTitle aside={`${appUsers.length} members`}>Team members</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="rounded-l-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Member</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Role</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Last active</th>
                    <th className="rounded-r-lg px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {appUsers.map((u, i) => (
                    <tr key={u.id} className={i % 2 === 1 ? "bg-surface/60" : ""}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                            {initials(u.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="flex items-center gap-1.5 rounded-lg bg-surface-low px-2.5 py-1.5 text-xs font-medium">
                          {u.role}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Chip>{u.status}</Chip>
                      </td>
                      <td className="px-4 py-3">
                        <span className="numeric text-xs text-muted-foreground">{u.lastActive}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-low hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-surface-low p-3">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@bhairava.in"
                className="h-9 min-w-[220px] flex-1 rounded-lg bg-surface-c px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AppUser["role"])}
                className="h-9 rounded-lg bg-surface-c px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <Btn variant="primary">
                <Plus className="h-4 w-4" /> Invite member
              </Btn>
            </div>
          </Panel>

          <Panel tonal>
            <SectionTitle>Roles explained</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { role: "Founder", desc: "Full access to every workspace, billing and danger-zone actions." },
                { role: "Administrator", desc: "Manage projects, users and settings, excluding billing." },
                { role: "Sales", desc: "Create bookings, reservations and manage assigned customers." },
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
    </AppShell>
  );
}
