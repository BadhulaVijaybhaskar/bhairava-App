import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, SectionTitle, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";

export const Route = createFileRoute("/settings/company")({
  head: () => ({
    meta: [
      { title: "Company Settings — Bhairava" },
      { name: "description", content: "Manage company profile, branding, sales defaults and notification preferences." },
      { property: "og:title", content: "Company Settings — Bhairava" },
      { property: "og:description", content: "Manage company profile, branding, sales defaults and notification preferences." },
    ],
  }),
  component: CompanySettings,
});

const inputCls =
  "h-9 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary";

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block pb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{label}</span>
      <input className={inputCls} {...props} />
    </label>
  );
}

function Toggle({ label, hint, defaultChecked }: { label: string; hint?: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-low px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="pt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-surface-c"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function CompanySettings() {
  return (
    <AppShell>
      <PageHeader eyebrow="Settings" title="Company" description="Workspace identity, sales defaults and notification preferences." />

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />

        <div className="min-w-0 flex-1 space-y-6">
          <Panel>
            <SectionTitle>Company profile</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company name" defaultValue="Astranova Bhairava Developers" />
              <Field label="Registered office" defaultValue="Hyderabad, Telangana" />
              <Field label="GSTIN" defaultValue="36AACFB1234C1Z5" />
              <Field label="RERA registration" defaultValue="P02400012345" />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Branding</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary color" type="text" defaultValue="#2F6B4F" />
              <Field label="Support email" type="email" defaultValue="support@bhairava.in" />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Sales defaults</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Reservation validity (days)" type="number" defaultValue={7} />
              <Field label="GST rate (%)" type="number" defaultValue={5} />
              <Field label="Default booking token (₹)" type="number" defaultValue={100000} />
            </div>
          </Panel>

          <Panel tonal>
            <SectionTitle>Notifications</SectionTitle>
            <div className="space-y-3">
              <Toggle label="New booking alerts" hint="Notify sales heads when a booking is confirmed" defaultChecked />
              <Toggle label="Reservation expiry reminders" hint="Alert agents a day before a reservation lapses" defaultChecked />
              <Toggle label="Payment failure alerts" hint="Notify finance team on failed transactions" defaultChecked />
              <Toggle label="Weekly digest email" hint="Portfolio summary every Monday" />
            </div>
          </Panel>

          <Panel className="border-none">
            <SectionTitle>Danger zone</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-destructive/10 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-destructive">Delete workspace</p>
                <p className="pt-0.5 text-xs text-muted-foreground">Permanently remove all projects, plots and customer data. This cannot be undone.</p>
              </div>
              <Btn variant="tonal">Delete workspace</Btn>
            </div>
          </Panel>

          <div className="flex justify-end">
            <Btn variant="primary">Save changes</Btn>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
