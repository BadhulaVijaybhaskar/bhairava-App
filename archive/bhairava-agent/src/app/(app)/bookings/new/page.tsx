import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { createBookingWithCustomer } from "../actions";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { PlotStatusBadge } from "@/components/mobile/status-badge";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ plotId?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const plotId = sp.plotId || "";

  const plot = plotId
    ? await prisma.plot.findFirst({
        where: { id: plotId, organizationId: session.orgId, deletedAt: null },
        include: {
          project: { select: { name: true } },
          block: { select: { name: true } },
        },
      })
    : null;

  if (plot) {
    const ok = await prisma.agentProjectAssignment.findFirst({
      where: { agentId: session.agentId, projectId: plot.projectId },
    });
    if (!ok) notFound();
  }

  return (
    <div>
      <MobileHeader title="New Booking" backHref="/bookings" showBell={false} />

      {sp.error === "required" ? (
        <p className="mb-2 text-[12px] text-[var(--danger)]">Customer name and mobile required.</p>
      ) : null}
      {sp.error === "plot" ? (
        <p className="mb-2 text-[12px] text-[var(--danger)]">Plot not available.</p>
      ) : null}

      {plot ? (
        <>
          <p className="mb-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            Plot Information
          </p>
          <div className="m-card mb-4 p-3.5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-[var(--ink)]">
                  {plot.plotNumber}, {plot.project.name}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Block {plot.block?.name ?? "—"} · {Number(plot.area)}{" "}
                  {plot.areaUnit === "SQ_YARD" || !plot.areaUnit
                    ? "Sq. Yds"
                    : plot.areaUnit.replaceAll("_", " ")}{" "}
                  · {plot.facing?.replaceAll("_", " ") ?? "—"} Facing
                </p>
              </div>
              <PlotStatusBadge status={plot.status} />
            </div>
            <p className="text-[14px] font-bold text-[var(--ink)]">
              Price: {formatINR(Number(plot.totalPrice))}
            </p>
          </div>

          <form action={createBookingWithCustomer} className="space-y-3 pb-4">
            <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Customer Information
            </p>
            <input type="hidden" name="plotId" value={plot.id} />
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">
                Customer Name
              </label>
              <input name="fullName" className="m-input !pl-3" required />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">
                Mobile Number
              </label>
              <input
                name="mobile"
                type="tel"
                inputMode="tel"
                className="m-input !pl-3"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-muted-foreground">
                Email
              </label>
              <input name="email" type="email" className="m-input !pl-3" />
            </div>
            <button type="submit" className="m-btn sticky bottom-2 mt-2">
              Continue
            </button>
          </form>
        </>
      ) : (
        <div className="m-card p-4 text-[13px] text-muted-foreground">
          Open an available plot and tap Reserve Plot.
          <Link href="/projects" className="mt-2 block font-semibold text-[var(--brand)]">
            Go to projects →
          </Link>
        </div>
      )}
    </div>
  );
}
