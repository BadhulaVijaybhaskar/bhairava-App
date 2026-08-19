import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIndianDate } from "@/lib/dates";
import { StatusBadge } from "@/components/status-badge";
import { PlotCustomerOptions } from "@/components/plots/plot-customer-options";
import { PlotEditForm } from "@/components/plots/plot-edit-form";
import { PLOT_STATUS_COLORS } from "@/lib/constants";

const PURCHASE_STATUSES = new Set([
  "RESERVED",
  "BOOKED",
  "UNDER_DOCUMENTATION",
  "SOLD",
  "REGISTERED",
  "RESALE_AVAILABLE",
]);

export default async function PlotDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ projectId?: string; saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  // Core plot first (always loads even if interests relation is stale)
  const plot = await prisma.plot.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true, code: true, city: true } },
      phase: { select: { name: true } },
      block: { select: { name: true } },
      assignedCustomer: {
        select: { id: true, fullName: true, mobile: true, email: true },
      },
      assignedAgent: { select: { fullName: true, mobile: true } },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!plot) notFound();

  let interests: Array<{
    id: string;
    type: string;
    guestName: string | null;
    guestMobile: string | null;
    message: string | null;
    createdAt: Date;
  }> = [];

  try {
    interests = await prisma.plotInterest.findMany({
      where: { plotId: plot.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        guestName: true,
        guestMobile: true,
        message: true,
        createdAt: true,
      },
    });
  } catch {
    interests = [];
  }

  const backHref = sp.projectId
    ? `/admin/projects/${sp.projectId}`
    : `/admin/projects/${plot.project.id}`;

  const showCustomer =
    !!plot.assignedCustomer &&
    (PURCHASE_STATUSES.has(plot.status) || !!plot.assignedCustomerId);

  const statusMeta = PLOT_STATUS_COLORS[plot.status];

  const rows: { label: string; value: string }[] = [
    { label: "Project", value: plot.project.name },
    { label: "Phase", value: plot.phase?.name || "—" },
    { label: "Block", value: plot.block?.name || "—" },
    { label: "Area", value: `${Number(plot.area)} ${plot.areaUnit.replace("_", " ")}` },
    { label: "Facing", value: plot.facing?.replaceAll("_", " ") || "—" },
    { label: "Base price", value: formatINR(Number(plot.basePrice)) },
    { label: "Total price", value: formatINR(Number(plot.totalPrice)) },
    { label: "Booking date", value: formatIndianDate(plot.bookingDate) },
    { label: "Registration date", value: formatIndianDate(plot.registrationDate) },
    { label: "Agent", value: plot.assignedAgent?.fullName || "—" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to project plots
        </Link>

        <div
          className="mt-3 overflow-hidden rounded-[1.4rem] border border-border/70 bg-white p-5"
          style={{ borderTopWidth: 4, borderTopColor: statusMeta.hex }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Plot {plot.plotNumber}
                </h2>
                <StatusBadge status={plot.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {plot.project.name}
                {plot.project.city ? ` · ${plot.project.city}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Price</p>
              <p className="text-xl font-bold text-foreground sm:text-2xl">
                {formatINR(Number(plot.totalPrice))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer options FIRST — immediately visible after click */}
      <PlotCustomerOptions
        plotId={plot.id}
        plotNumber={plot.plotNumber}
        status={plot.status}
      />

      <section className="surface p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Purchased by</h3>
        {showCustomer && plot.assignedCustomer ? (
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-low)] text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{plot.assignedCustomer.fullName}</p>
              <p className="text-sm text-muted-foreground">{plot.assignedCustomer.mobile}</p>
              {plot.assignedCustomer.email ? (
                <p className="text-sm text-muted-foreground">{plot.assignedCustomer.email}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No customer yet — this plot is not purchased.</p>
        )}
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <h3 className="font-semibold text-foreground">Plot details</h3>
        </div>
        <dl className="space-y-0">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-3 gap-3 px-5 py-2.5 text-sm">
              <dt className="font-medium text-muted-foreground">{row.label}</dt>
              <dd className="col-span-2 font-semibold text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="surface p-5">
        <h3 className="font-semibold text-foreground">App interest & views</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer interest from the app (or the demo buttons above) shows here and in Notifications.
        </p>
        {interests.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No interest or views yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {interests.map((interest) => (
              <li
                key={interest.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {interest.type.replaceAll("_", " ")}
                    <span className="font-medium text-muted-foreground">
                      {" "}
                      · {interest.guestName || interest.guestMobile || "App user"}
                    </span>
                  </p>
                  {interest.message ? (
                    <p className="text-xs text-muted-foreground">{interest.message}</p>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">{formatIndianDate(interest.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {plot.statusHistory.length > 0 ? (
        <section className="surface p-5">
          <h3 className="font-semibold text-foreground">Status history</h3>
          <ul className="mt-3 space-y-2">
            {plot.statusHistory.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">
                  {h.fromStatus ? `${h.fromStatus} → ` : ""}
                  {h.toStatus}
                </span>
                <span className="text-muted-foreground">{formatIndianDate(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PlotEditForm
        error={sp.error}
        saved={sp.saved === "1"}
        plot={{
          id: plot.id,
          plotNumber: plot.plotNumber,
          area: Number(plot.area),
          areaUnit: plot.areaUnit,
          facing: plot.facing,
          pricePerSqYard: plot.pricePerSqYard != null ? Number(plot.pricePerSqYard) : null,
          basePrice: Number(plot.basePrice),
          additionalCharges: Number(plot.additionalCharges),
          totalPrice: Number(plot.totalPrice),
          status: plot.status,
          notes: plot.notes,
          blockName: plot.block?.name ?? null,
        }}
      />
    </div>
  );
}
