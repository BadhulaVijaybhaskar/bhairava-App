import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getSession } from "@/lib/auth";
import { canAccessFounderBilling } from "@/lib/domain/management";
import { useManagement } from "@/lib/management-store";

export const Route = createFileRoute("/settings/billing")({
  head: () => ({
    meta: [
      { title: "Founder Billing — Bhairava" },
      { name: "description", content: "Founder-only billing surface. Payment provider pending." },
    ],
  }),
  component: BillingSettings,
});

function BillingSettings() {
  const session = getSession();
  const allowed = canAccessFounderBilling(session?.role);
  const mgmt = useManagement();
  const [email, setEmail] = useState(mgmt.billing.billingEmail);
  const [msg, setMsg] = useState<string | null>(null);
  const activeMembers = mgmt.members.filter((m) => m.statusV2 === "active").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Settings"
        title="Founder billing"
        description="Plan metadata only. Seat counts come from Members. No live charge actions until billing integration is connected."
      />
      <div className="flex flex-col gap-8 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">
          {!allowed ? (
            <Panel>
              <p className="text-sm text-muted-foreground" data-testid="billing-denied">
                Founder-only. Your role cannot view billing.
              </p>
            </Panel>
          ) : (
            <>
              <Panel data-testid="billing-surface">
                <SectionTitle aside={<Chip tone="positive">{mgmt.billing.status}</Chip>}>
                  <span className="inline-flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    {mgmt.billing.planName}
                  </span>
                </SectionTitle>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Billing contact</dt>
                    <dd>
                      <input
                        className="mt-1 h-9 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="billing-email"
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Renews on</dt>
                    <dd className="font-medium">{mgmt.billing.renewsOn ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Seats included</dt>
                    <dd className="font-medium">{mgmt.billing.seatsIncluded}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Active members</dt>
                    <dd className="font-medium">{activeMembers}</dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-lg bg-surface-c p-3 text-xs text-muted-foreground">{mgmt.billing.notes}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn
                    variant="primary"
                    data-testid="billing-save-contact"
                    onClick={() => {
                      const res = mgmt.saveBilling({ billingEmail: email });
                      setMsg(res.ok ? "Billing contact saved." : res.error);
                    }}
                  >
                    Save billing contact
                  </Btn>
                  <Btn variant="tonal" disabled data-testid="billing-portal-soon">
                    Open billing portal (pending)
                  </Btn>
                </div>
                {msg && <p className="mt-3 text-sm">{msg}</p>}
              </Panel>
              <Panel data-testid="billing-invoices">
                <SectionTitle>Invoices</SectionTitle>
                <p className="text-sm text-muted-foreground">
                  No invoices yet — billing integration pending. Charge buttons stay disabled until a provider is connected.
                </p>
              </Panel>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
