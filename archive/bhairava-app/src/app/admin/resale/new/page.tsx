import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { FlashToast } from "@/components/ui/flash-toast";
import { createResaleListing } from "../actions";

export default async function NewResalePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; plotId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const plots = await prisma.plot.findMany({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      OR: [
        { status: { in: ["SOLD", "REGISTERED", "RESALE_AVAILABLE"] } },
        { resaleStatus: true },
      ],
      resaleListings: { none: { deletedAt: null } },
    },
    orderBy: { plotNumber: "asc" },
    include: { project: { select: { name: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-1 py-1">
        <Link href="/admin/resale" className="rounded-lg p-2 text-primary hover:bg-canvas">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {sp.error === "required" ? (
        <FlashToast variant="error" message="Select a plot and enter asking price." />
      ) : null}
      {sp.error === "plot" ? (
        <FlashToast variant="error" message="Plot not found." />
      ) : null}

      {plots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No eligible plots without an active listing. Mark a sold/registered plot for resale first.
        </p>
      ) : (
        <form action={createResaleListing} className="surface space-y-3 p-4 sm:p-5">
          <label className="block text-sm font-semibold text-foreground">
            Plot
            <select
              name="plotId"
              required
              className="input-field mt-1 !pl-3"
              defaultValue={sp.plotId ?? ""}
            >
              <option value="">Select plot</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.plotNumber} · {p.project.name} · {formatINR(Number(p.totalPrice))}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Asking price (₹)
            <input
              name="askingPrice"
              type="number"
              min={1}
              step="1"
              required
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Status
            <select name="status" className="input-field mt-1 !pl-3" defaultValue="LISTED">
              <option value="LISTED">Listed</option>
              <option value="UNDER_OFFER">Under offer</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Notes
            <textarea name="notes" rows={3} className="input-field mt-1 !pl-3" />
          </label>
          <button type="submit" className="btn-primary px-6 py-2.5">
            Create listing
          </button>
        </form>
      )}
    </div>
  );
}
