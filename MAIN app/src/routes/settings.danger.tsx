import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getSession } from "@/lib/auth";
import { useData } from "@/lib/store";
import { canAccessDangerZone, dangerZoneAllowed } from "@/lib/domain/management";
import { useManagement } from "@/lib/management-store";

export const Route = createFileRoute("/settings/danger")({
  head: () => ({
    meta: [
      { title: "Danger Zone — Bhairava" },
      { name: "description", content: "Founder-only archive/restore and demo reset." },
    ],
  }),
  component: DangerZoneSettings,
});

function DangerZoneSettings() {
  const session = getSession();
  const allowed = canAccessDangerZone(session?.role);
  const store = useData();
  const mgmt = useManagement();
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [projectId, setProjectId] = useState(store.projects[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const activeArchives = useMemo(() => mgmt.archives.filter((a) => !a.restoredAt), [mgmt.archives]);

  function resetDemo() {
    if (!dangerZoneAllowed(session?.role, "reset_demo_data")) {
      setMsg("Not allowed.");
      return;
    }
    if (confirm.trim() !== "RESET DEMO") {
      setMsg("Type RESET DEMO to confirm.");
      return;
    }
    if (reason.trim().length < 3) {
      setMsg("Reason required.");
      return;
    }
    store.reset();
    mgmt.resetManagement();
    mgmt.recordAudit({
      actorId: session?.email || "founder",
      actorEmail: session?.email || "founder@bhairava.com",
      action: "danger.reset_demo",
      entityType: "workspace",
      entityId: "workspace",
      summary: `Reset demo data: ${reason.trim()}`,
      before: "dirty",
      after: "seed",
    });
    setMsg("Demo workspace + management data reset (local).");
    setConfirm("");
    setReason("");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Danger zone"
        description="Founder-only. Archive/restore keeps history. Permanent hard-delete of operational history is not offered."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          {!allowed ? (
            <Panel>
              <p className="text-sm text-muted-foreground" data-testid="danger-denied">
                Founder-only. Your role cannot access the danger zone.
              </p>
            </Panel>
          ) : (
            <>
              <Panel data-testid="danger-archive">
                <SectionTitle>
                  <span className="inline-flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Archive project
                  </span>
                </SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">Soft-archive with typed reason. Restore remains available.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project
                    <select
                      className="mt-1.5 h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      data-testid="danger-archive-project"
                    >
                      {store.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Reason
                    <input
                      className="mt-1.5 h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      data-testid="danger-archive-reason"
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <Btn
                    variant="primary"
                    data-testid="danger-archive-submit"
                    onClick={() => {
                      const p = store.projects.find((x) => x.id === projectId);
                      if (!p) {
                        setMsg("Select a project.");
                        return;
                      }
                      const res = mgmt.archiveProject({
                        entityId: p.id,
                        entityLabel: p.name || p.code || p.id,
                        reason,
                      });
                      setMsg(res.ok ? `Archived ${p.name}.` : res.error);
                      if (res.ok) setReason("");
                    }}
                  >
                    Archive project
                  </Btn>
                </div>
                {activeArchives.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {activeArchives.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm">
                        <span>
                          {a.entityLabel} · {a.reason}
                        </span>
                        <Btn
                          variant="tonal"
                          onClick={() => {
                            const res = mgmt.restoreProject(a.id);
                            setMsg(res.ok ? `Restored ${a.entityLabel}.` : res.error);
                          }}
                        >
                          Restore
                        </Btn>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel data-testid="danger-surface">
                <SectionTitle>
                  <span className="inline-flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Reset demo data
                  </span>
                </SectionTitle>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clears persisted MAIN localStorage demo edits and restores seed. Does not push.
                </p>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reason
                  <input
                    className="mt-1.5 h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    data-testid="danger-reset-reason"
                  />
                </label>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type RESET DEMO to confirm
                  <input
                    className="mt-1.5 h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    data-testid="danger-confirm-input"
                  />
                </label>
                <div className="mt-4">
                  <Btn variant="primary" onClick={resetDemo} data-testid="danger-reset-demo">
                    Reset demo workspace
                  </Btn>
                </div>
              </Panel>
              {msg && (
                <p className="text-sm" data-testid="danger-msg">
                  {msg}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
