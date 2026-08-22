import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { FlashToast } from "@/components/ui/flash-toast";
import { updateOrganizationSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const org = await prisma.organization.findFirst({
    where: { id: session.orgId },
    include: { settings: true },
  });
  if (!org) redirect("/login");

  const s = org.settings;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <div className="flex items-center gap-1 py-1">
        <Link
          href="/admin/dashboard"
          className="rounded-lg p-2 text-primary hover:bg-canvas"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {sp.saved === "1" ? <FlashToast message="Settings saved." /> : null}
      {sp.error === "required" ? (
        <FlashToast variant="error" message="Organisation name and code are required." />
      ) : null}

      <form action={updateOrganizationSettings} className="space-y-3">
        <div className="surface overflow-hidden p-0">
          <div className="grid gap-x-3 gap-y-3 p-4 sm:grid-cols-6 sm:p-5">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Organisation name *
              </span>
              <input
                name="name"
                required
                defaultValue={org.name}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Code *
              </span>
              <input
                name="code"
                required
                defaultValue={org.code}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Legal name
              </span>
              <input
                name="legalName"
                defaultValue={org.legalName ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Website
              </span>
              <input
                name="website"
                defaultValue={org.website ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                GSTIN
              </span>
              <input
                name="gstin"
                defaultValue={org.gstin ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                PAN
              </span>
              <input
                name="pan"
                defaultValue={org.pan ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Phone
              </span>
              <input
                name="phone"
                defaultValue={org.phone ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Email
              </span>
              <input
                name="email"
                type="email"
                defaultValue={org.email ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-6">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Address
              </span>
              <input
                name="address"
                defaultValue={org.address ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                City
              </span>
              <input
                name="city"
                defaultValue={org.city ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                State
              </span>
              <input
                name="state"
                defaultValue={org.state ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Pincode
              </span>
              <input
                name="pincode"
                defaultValue={org.pincode ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
          </div>
        </div>

        <div className="surface overflow-hidden p-0">
          <div className="grid gap-x-3 gap-y-3 p-4 sm:grid-cols-6 sm:p-5">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Support email
              </span>
              <input
                name="supportEmail"
                type="email"
                defaultValue={s?.supportEmail ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Support phone
              </span>
              <input
                name="supportPhone"
                defaultValue={s?.supportPhone ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Brand color
              </span>
              <input
                name="primaryColor"
                type="color"
                defaultValue={s?.primaryColor || "#0B3D91"}
                className="h-10 w-full cursor-pointer rounded-lg border border-border/90 bg-white px-1"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Currency
              </span>
              <input
                name="currencyCode"
                defaultValue={s?.currencyCode || "INR"}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Timezone
              </span>
              <input
                name="timezone"
                defaultValue={s?.timezone || "Asia/Kolkata"}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Date format
              </span>
              <input
                name="dateFormat"
                defaultValue={s?.dateFormat || "dd MMM yyyy"}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Support address line
              </span>
              <input
                name="addressLine"
                defaultValue={s?.addressLine ?? ""}
                className="w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-brand/15"
              />
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary px-8 py-3">
          Save settings
        </button>
      </form>
    </div>
  );
}
