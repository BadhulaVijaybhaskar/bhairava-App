import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, SectionTitle, Btn, SwitchControl } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { useOccupyCreateFab } from "@/lib/fab-visibility";
import { useManagement } from "@/lib/management-store";
import type { CompanySettingsP6 } from "@/lib/domain/management-p6";

export const Route = createFileRoute("/settings/company")({
  head: () => ({
    meta: [
      { title: "Company Settings — Bhairava" },
      { name: "description", content: "Company profile, receipt defaults and notification preferences." },
    ],
  }),
  component: CompanySettingsPage,
});

const inputCls =
  "h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary";

function Field({
  label,
  value,
  onChange,
  type = "text",
  testId,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  testId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{label}</span>
      <input className={inputCls} type={type} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
    </label>
  );
}

function CompanySettingsPage() {
  useOccupyCreateFab();
  const mgmt = useManagement();
  const [form, setForm] = useState<CompanySettingsP6>(mgmt.company);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm(mgmt.company);
  }, [mgmt.company]);

  function patch<K extends keyof CompanySettingsP6>(key: K, value: CompanySettingsP6[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <AppShell hideFab>
      <PageHeader
        eyebrow="Settings"
        title="Company"
        description="Workspace identity, sales defaults and notification preferences. Persisted locally."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          <Panel data-testid="company-profile">
            <SectionTitle>Company profile</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal name" value={form.legalName} onChange={(v) => patch("legalName", v)} testId="company-legal-name" />
              <Field label="Trade name" value={form.tradeName} onChange={(v) => patch("tradeName", v)} testId="company-trade-name" />
              <Field label="Address" value={form.address} onChange={(v) => patch("address", v)} />
              <Field label="City" value={form.city} onChange={(v) => patch("city", v)} />
              <Field label="State" value={form.state} onChange={(v) => patch("state", v)} />
              <Field label="Pincode" value={form.pincode} onChange={(v) => patch("pincode", v)} />
              <Field label="Phone" value={form.phone} onChange={(v) => patch("phone", v)} />
              <Field label="Email" value={form.email} onChange={(v) => patch("email", v)} testId="company-email" />
              <Field label="GSTIN" value={form.gstin} onChange={(v) => patch("gstin", v)} testId="company-gstin" />
              <Field label="PAN" value={form.pan} onChange={(v) => patch("pan", v)} />
              <Field label="RERA / company ref" value={form.rera} onChange={(v) => patch("rera", v)} testId="company-rera" />
              <Field label="Logo ref" value={form.logoRef} onChange={(v) => patch("logoRef", v)} testId="company-logo-ref" />
            </div>
          </Panel>

          <Panel data-testid="company-receipts">
            <SectionTitle>Receipt & reservation defaults</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Receipt prefix" value={form.receiptPrefix} onChange={(v) => patch("receiptPrefix", v)} />
              <Field
                label="Default reservation (days)"
                type="number"
                value={form.defaultReservationDays}
                onChange={(v) => patch("defaultReservationDays", Number(v) || 7)}
                testId="company-reservation-days"
              />
              <Field label="Website" value={form.website} onChange={(v) => patch("website", v)} />
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Receipt footer</span>
              <textarea
                className="min-h-[72px] w-full rounded-lg bg-surface-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                value={form.receiptFooter}
                onChange={(e) => patch("receiptFooter", e.target.value)}
                data-testid="company-receipt-footer"
              />
            </label>
          </Panel>

          <Panel tonal data-testid="company-notif-prefs">
            <SectionTitle>Notification preferences</SectionTitle>
            <div className="space-y-2">
              {form.notificationPrefs.map((p) => (
                <div key={p.category} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 rounded-lg bg-surface-low px-4 py-2.5">
                  <p className="text-sm font-medium capitalize">{p.category}</p>
                  <label className="flex items-center gap-2 text-xs">
                    In-app
                    <SwitchControl
                      checked={p.inApp}
                      onCheckedChange={(on) =>
                        patch(
                          "notificationPrefs",
                          form.notificationPrefs.map((x) => (x.category === p.category ? { ...x, inApp: on } : x)),
                        )
                      }
                      label={`${p.category} in-app`}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    Email
                    <SwitchControl
                      checked={p.email}
                      onCheckedChange={(on) =>
                        patch(
                          "notificationPrefs",
                          form.notificationPrefs.map((x) => (x.category === p.category ? { ...x, email: on } : x)),
                        )
                      }
                      label={`${p.category} email`}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Panel>

          <div className="flex justify-end">
            <Btn
              variant="primary"
              className="min-h-12 w-full justify-center lg:w-auto"
              data-testid="company-save"
              disabled={!mgmt.canMutate}
              onClick={() => {
                const res = mgmt.saveCompany(form);
                setMsg(res.ok ? "Company settings saved." : res.error);
              }}
            >
              Save changes
            </Btn>
          </div>
          {msg && (
            <p className="text-sm" data-testid="company-msg">
              {msg}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
