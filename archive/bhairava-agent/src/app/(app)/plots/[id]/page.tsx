import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { PlotStatusBadge } from "@/components/mobile/status-badge";
import { SectionHeader } from "@/components/mobile/section-header";
import { EmptyState } from "@/components/mobile/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export default async function AgentPlotDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const plot = await prisma.plot.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      block: { select: { name: true } },
      assignedCustomer: { select: { id: true, fullName: true } },
    },
  });
  if (!plot) notFound();

  const assigned = await prisma.agentProjectAssignment.findFirst({
    where: { agentId: session.agentId, projectId: plot.projectId },
  });
  if (!assigned) notFound();

  const nearby = await prisma.plot.findMany({
    where: {
      projectId: plot.projectId,
      deletedAt: null,
      id: { not: plot.id },
      ...(plot.blockId ? { blockId: plot.blockId } : {}),
    },
    take: 4,
    orderBy: { plotNumber: "asc" },
    select: { id: true, plotNumber: true, status: true },
  });

  const canReserve = plot.status === "AVAILABLE" || plot.status === "RESERVED";
  const docsHref = plot.assignedCustomer
    ? `/documents?tab=plot&plotId=${plot.id}&customerId=${plot.assignedCustomer.id}`
    : `/documents?tab=plot&plotId=${plot.id}`;

  const rows = [
    { label: "Project", value: plot.project.name },
    { label: "Block", value: plot.block?.name ?? "—" },
    {
      label: "Area",
      value: `${Number(plot.area)} ${
        plot.areaUnit === "SQ_YARD" || !plot.areaUnit
          ? "Sq. Yds"
          : plot.areaUnit.replaceAll("_", " ")
      }`,
    },
    { label: "Facing", value: plot.facing?.replaceAll("_", " ") ?? "—" },
    { label: "Price", value: formatINR(Number(plot.totalPrice)) },
    { label: "Status", value: plot.status.replaceAll("_", " ") },
    { label: "Owner", value: plot.assignedCustomer?.fullName ?? "—" },
    {
      label: "Booking Date",
      value: plot.bookingDate
        ? plot.bookingDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—",
    },
  ];

  return (
    <div>
      <MobileHeader title="Plot Details" backHref={`/projects/${plot.projectId}`} showOverflow />

      <FadeIn>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Plot No.</p>
            <h2 className="text-[22px] font-bold leading-tight text-foreground">{plot.plotNumber}</h2>
          </div>
          <PlotStatusBadge status={plot.status} />
        </div>

        <Card className="shadow-sm">
          <CardContent className="divide-y divide-border px-3.5 py-0">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3 py-2.5 text-[13px]">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-right font-semibold text-foreground">{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="mt-4 space-y-2">
          {canReserve ? (
            <Link href={`/bookings/new?plotId=${plot.id}`} className="inline-flex">
              <Button className="h-12 w-full text-[15px]">Reserve Plot</Button>
            </Link>
          ) : (
            <Button className="h-12 w-full text-[15px]" disabled title="Not available for reservation">
              Reserve Plot
            </Button>
          )}
          <Link href={docsHref} className="inline-flex w-full">
            <Button
              variant="outline"
              className="h-12 w-full border-primary text-[15px] text-primary"
            >
              View Documents
            </Button>
          </Link>
        </div>

        <div className="mt-5">
          <SectionHeader title="Nearby Plots" />
          {nearby.length === 0 ? (
            <EmptyState message="No nearby plots available" />
          ) : (
            <Card className="shadow-sm">
              <CardContent className="px-3 py-0">
                {nearby.map((n) => (
                  <Link key={n.id} href={`/plots/${n.id}`} className="list-row">
                    <span className="flex-1 text-[13px] font-semibold">{n.plotNumber}</span>
                    <PlotStatusBadge status={n.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
