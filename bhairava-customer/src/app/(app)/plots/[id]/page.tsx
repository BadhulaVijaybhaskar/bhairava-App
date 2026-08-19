import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { formatINR, cn } from "@/lib/utils";
import { registerInterestForm } from "./actions";

/**
 * Plot details for customers.
 * If the plot belongs to someone else → show status/specs only, never their PII.
 * If AVAILABLE → show price + interest.
 * If mine → full own details.
 */
export default async function CustomerPlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const plot = await prisma.plot.findFirst({
    where: {
      id,
      organizationId: session.orgId,
      deletedAt: null,
      project: { deletedAt: null, status: "ACTIVE" },
    },
    include: {
      project: { select: { id: true, name: true, city: true } },
      block: { select: { name: true } },
    },
  });
  if (!plot) notFound();

  const isMine = !!session.customerId && plot.assignedCustomerId === session.customerId;
  const isAvailable = plot.status === "AVAILABLE";
  const meta = PLOT_STATUS_COLORS[plot.status];

  const rows: { label: string; value: string }[] = [
    { label: "Project", value: plot.project.name },
    { label: "Block", value: plot.block?.name ?? "—" },
    { label: "Area", value: `${Number(plot.area)} ${plot.areaUnit}` },
    { label: "Facing", value: plot.facing ?? "—" },
    { label: "Status", value: meta.label },
  ];

  if (isAvailable || isMine) {
    rows.splice(4, 0, { label: "Price", value: formatINR(Number(plot.totalPrice)) });
  }

  if (isMine) {
    rows.push({ label: "Owner", value: "You" });
  }
  // Intentionally never add other customers' names/phones here.

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href={`/projects/${plot.projectId}`}
          className="rounded-lg p-2 text-brand hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold text-ink">Plot {plot.plotNumber}</h1>
          <p className="text-sm text-muted">{plot.project.name}</p>
        </div>
        <span className={cn("status-pill text-[10px]", meta.bg, meta.text)}>{meta.label}</span>
      </div>

      <dl className="surface space-y-2 p-4 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className="text-muted">{r.label}</dt>
            <dd className="text-right font-semibold text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>

      {!isAvailable && !isMine ? (
        <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-muted">
          This plot is {meta.label.toLowerCase()}. Other buyers&apos; personal details are not
          shown.
        </p>
      ) : null}

      {isAvailable && session.customerId ? (
        <form action={registerInterestForm}>
          <input type="hidden" name="plotId" value={plot.id} />
          <button type="submit" className="btn-primary w-full py-3">
            Register interest
          </button>
        </form>
      ) : null}

      {isMine ? (
        <Link href="/my-plot" className="btn-primary block w-full py-3 text-center">
          Go to My Plot
        </Link>
      ) : null}

      <Link
        href={`/projects/${plot.projectId}`}
        className="block text-center text-sm font-semibold text-brand"
      >
        View full layout →
      </Link>
    </div>
  );
}
