import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ResaleStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/ui/flash-toast";
import { updateResaleListing } from "../actions";

const STATUS_STYLE: Record<ResaleStatus, string> = {
  LISTED: "bg-orange-100 text-orange-800",
  UNDER_OFFER: "bg-amber-100 text-amber-800",
  SOLD: "bg-emerald-100 text-emerald-800",
  WITHDRAWN: "bg-[var(--surface-low)] text-muted-foreground",
};

const STATUS_LABEL: Record<ResaleStatus, string> = {
  LISTED: "Listed",
  UNDER_OFFER: "Under offer",
  SOLD: "Sold",
  WITHDRAWN: "Withdrawn",
};

export default async function ResaleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const listing = await prisma.resaleListing.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      plot: {
        select: {
          id: true,
          plotNumber: true,
          assignedCustomer: { select: { id: true, fullName: true } },
        },
      },
      project: { select: { id: true, name: true } },
    },
  });
  if (!listing) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-1 py-1">
        <Link href="/admin/resale" className="rounded-lg p-2 text-primary hover:bg-canvas">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{listing.plot.plotNumber}</p>
          <p className="text-xs text-muted-foreground">{listing.project.name}</p>
        </div>
        <span className={cn("status-pill", STATUS_STYLE[listing.status])}>
          {STATUS_LABEL[listing.status]}
        </span>
      </div>

      {sp.saved === "1" ? <FlashToast message="Resale listing saved." /> : null}
      {sp.error === "exists" ? (
        <FlashToast variant="error" message="A listing already exists for this plot." />
      ) : null}
      {sp.error === "required" ? (
        <FlashToast variant="error" message="Asking price is required." />
      ) : null}

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Plot</span>
          <Link href={`/admin/plots/${listing.plot.id}`} className="font-semibold text-primary">
            {listing.plot.plotNumber}
          </Link>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Owner</span>
          {listing.plot.assignedCustomer ? (
            <Link
              href={`/admin/customers/${listing.plot.assignedCustomer.id}`}
              className="font-semibold text-primary"
            >
              {listing.plot.assignedCustomer.fullName}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">—</span>
          )}
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Listed</span>
          <span className="font-semibold text-foreground">
            {formatIndianDate(listing.listedAt)}
          </span>
        </div>
      </div>

      <form action={updateResaleListing} className="surface space-y-3 p-4 sm:p-5">
        <input type="hidden" name="id" value={listing.id} />
        <label className="block text-sm font-semibold text-foreground">
          Asking price (₹)
          <input
            name="askingPrice"
            type="number"
            min={1}
            step="1"
            required
            defaultValue={Number(listing.askingPrice)}
            className="input-field mt-1 !pl-3"
          />
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Status
          <select name="status" className="input-field mt-1 !pl-3" defaultValue={listing.status}>
            {(Object.keys(STATUS_LABEL) as ResaleStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={listing.notes ?? ""}
            className="input-field mt-1 !pl-3"
          />
        </label>
        <button type="submit" className="btn-primary px-6 py-2.5">
          Save listing
        </button>
      </form>
    </div>
  );
}
