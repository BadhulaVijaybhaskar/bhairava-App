import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, SectionTitle, Btn, SwitchControl } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { useOccupyCreateFab } from "@/lib/fab-visibility";
import { useData } from "@/lib/store";
import type { CompanySettings } from "@/lib/company";
import { canDeleteWorkspace, canEditCompany } from "@/lib/permissions";
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

export const Route = createFileRoute("/settings/company")({
  head: () => ({
    meta: [
      { title: "Company Settings — Bhairava" },
      {
        name: "description",
        content: "Manage company profile, branding, sales defaults and notification preferences.",
      },
      { property: "og:title", content: "Company Settings — Bhairava" },
      {
        property: "og:description",
        content: "Manage company profile, branding, sales defaults and notification preferences.",
      },
    ],
  }),
  component: CompanySettingsPage,
});

const inputCls =
  "h-10 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary disabled:opacity-60";

function Field({
  label,
  value,
  onChange,
  disabled,
  ...props
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "disabled">) {
  return (
    <label className="block">
      <span className="block pb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      <input
        className={inputCls}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg bg-surface-low px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="pt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <SwitchControl
        checked={checked}
        onCheckedChange={onCheckedChange}
        label={label}
        {...(disabled ? { disabled: true } : {})}
      />
    </div>
  );
}

function CompanySettingsPage() {
  useOccupyCreateFab();
  const { companySettings, saveCompanySettings, deleteWorkspace, currentUser } = useData();
  const [draft, setDraft] = useState<CompanySettings>(companySettings);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    setDraft(companySettings);
  }, [companySettings]);

  const canEdit = canEditCompany(currentUser);
  const canDelete = canDeleteWorkspace(currentUser);
  const set = <K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) => {
    setDraft((p) => ({ ...p, [key]: value }));
  };

  const onSave = () => {
    if (!canEdit) {
      toast.error("You do not have permission to edit company settings.");
      return;
    }
    saveCompanySettings(draft);
    toast.success("Company settings saved");
  };

  const onDelete = () => {
    if (confirmText.trim() !== "DELETE") {
      toast.error("Type DELETE to confirm.");
      return;
    }
    deleteWorkspace();
    setDeleteOpen(false);
    setConfirmText("");
    toast.success("Workspace data reset to defaults");
  };

  return (
    <AppShell hideFab>
      <PageHeader
        eyebrow="Settings"
        title="Company"
        description="Workspace identity, sales defaults and notification preferences."
      />

      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />

        <div className="min-w-0 flex-1 space-y-6">
          <Panel>
            <SectionTitle>Company profile</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company name"
                value={draft.companyName}
                disabled={!canEdit}
                onChange={(v) => set("companyName", v)}
              />
              <Field
                label="Registered office"
                value={draft.registeredOffice}
                disabled={!canEdit}
                onChange={(v) => set("registeredOffice", v)}
              />
              <Field
                label="GSTIN"
                value={draft.gstin}
                disabled={!canEdit}
                onChange={(v) => set("gstin", v)}
              />
              <Field
                label="RERA registration"
                value={draft.rera}
                disabled={!canEdit}
                onChange={(v) => set("rera", v)}
              />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Branding</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Primary color"
                type="text"
                value={draft.primaryColor}
                disabled={!canEdit}
                onChange={(v) => set("primaryColor", v)}
              />
              <Field
                label="Support email"
                type="email"
                value={draft.supportEmail}
                disabled={!canEdit}
                onChange={(v) => set("supportEmail", v)}
              />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Sales defaults</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Reservation validity (days)"
                type="number"
                value={draft.reservationValidityDays}
                disabled={!canEdit}
                onChange={(v) => set("reservationValidityDays", Number(v) || 0)}
              />
              <Field
                label="GST rate (%)"
                type="number"
                value={draft.gstRate}
                disabled={!canEdit}
                onChange={(v) => set("gstRate", Number(v) || 0)}
              />
              <Field
                label="Default booking token (₹)"
                type="number"
                value={draft.defaultBookingToken}
                disabled={!canEdit}
                onChange={(v) => set("defaultBookingToken", Number(v) || 0)}
              />
            </div>
          </Panel>

          <Panel tonal>
            <SectionTitle>Notifications</SectionTitle>
            <div className="space-y-2">
              <Toggle
                label="New booking alerts"
                hint="Notify sales heads when a booking is confirmed"
                checked={draft.notifyNewBooking}
                disabled={!canEdit}
                onCheckedChange={(v) => set("notifyNewBooking", v)}
              />
              <Toggle
                label="Reservation expiry reminders"
                hint="Alert agents a day before a reservation lapses"
                checked={draft.notifyReservationExpiry}
                disabled={!canEdit}
                onCheckedChange={(v) => set("notifyReservationExpiry", v)}
              />
              <Toggle
                label="Payment failure alerts"
                hint="Notify finance team on failed transactions"
                checked={draft.notifyPaymentFailure}
                disabled={!canEdit}
                onCheckedChange={(v) => set("notifyPaymentFailure", v)}
              />
              <Toggle
                label="Weekly digest email"
                hint="Portfolio summary every Monday"
                checked={draft.notifyWeeklyDigest}
                disabled={!canEdit}
                onCheckedChange={(v) => set("notifyWeeklyDigest", v)}
              />
            </div>
          </Panel>

          <Panel className="border-none">
            <SectionTitle>Danger zone</SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-destructive/10 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-destructive">Delete workspace</p>
                <p className="pt-0.5 text-xs text-muted-foreground">
                  Permanently remove all projects, plots and customer data. This cannot be undone.
                </p>
              </div>
              <Btn
                variant="tonal"
                disabled={!canDelete}
                {...(!canDelete ? { title: "Only Founders can delete the workspace." } : {})}
                onClick={() => setDeleteOpen(true)}
              >
                Delete workspace
              </Btn>
            </div>
          </Panel>

          <div className="flex justify-end">
            <Btn
              variant="primary"
              className="min-h-12 w-full justify-center lg:w-auto"
              disabled={!canEdit}
              onClick={onSave}
            >
              Save changes
            </Btn>
          </div>
        </div>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This resets all local workspace data to the demo seed. Type <strong>DELETE</strong> to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-destructive"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmText.trim() !== "DELETE"}
              onClick={onDelete}
            >
              Delete workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
