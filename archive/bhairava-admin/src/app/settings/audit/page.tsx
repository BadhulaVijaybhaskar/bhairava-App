"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { auditLog, appUsers } from "@/lib/mock-data";

export default function AuditSettings() {
  const [actor, setActor] = useState("All");
  const [action, setAction] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const actions = useMemo(() => Array.from(new Set(auditLog.map((a) => a.action))), []);

  const filtered = useMemo(() => {
    return auditLog.filter((a) => {
      if (actor !== "All" && a.actor !== actor) return false;
      if (action !== "All" && a.action !== action) return false;
      if (from && a.time.slice(0, 10) < from) return false;
      if (to && a.time.slice(0, 10) > to) return false;
      return true;
    });
  }, [actor, action, from, to]);

  return (
    <AppShell>
      <PageHeader eyebrow="Settings" title="Audit logs" description="A record of every meaningful change made in the Bhairava workspace." />

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />

        <div className="min-w-0 flex-1">
          <Panel>
            <SectionTitle
              aside={
                <Btn variant="tonal">
                  <Download className="h-4 w-4" /> Export
                </Btn>
              }
            >
              Activity
            </SectionTitle>

            <div className="flex flex-wrap items-center gap-2 pb-4">
              <select value={actor} onChange={(e) => setActor(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary">
                <option>All</option>
                {appUsers.map((u) => (
                  <option key={u.id}>{u.name}</option>
                ))}
              </select>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary">
                <option>All</option>
                {actions.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg bg-surface-low px-3 text-xs outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low">
                    <th className="rounded-l-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase whitespace-nowrap">Timestamp</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Actor</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Action</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Object</th>
                    <th className="rounded-r-lg px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Before → After</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} className={i % 2 === 1 ? "bg-surface/60" : ""}>
                      <td className="numeric px-4 py-3 text-xs whitespace-nowrap">{a.time}</td>
                      <td className="px-4 py-3 text-sm">{a.actor}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{a.action}</td>
                      <td className="numeric px-4 py-3 text-xs">{a.object}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-muted-foreground">{a.before}</span> <span className="text-muted-foreground">→</span>{" "}
                        <span className="font-medium">{a.after}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No activity matches these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
