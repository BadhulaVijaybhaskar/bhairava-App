import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Filter, RefreshCw } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { LayoutMapViewer } from "@/components/mobile/layout-map-viewer";
import { PlotStatusBadge } from "@/components/mobile/status-badge";
import { EmptyState } from "@/components/mobile/empty-state";

export default async function AgentProjectLayoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const statusFilter = (sp.status || "").trim();

  const assignment = await prisma.agentProjectAssignment.findFirst({
    where: { agentId: session.agentId, projectId: id },
  });
  if (!assignment) notFound();

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      plots: {
        where: {
          deletedAt: null,
          ...(statusFilter ? { status: statusFilter as never } : {}),
        },
        orderBy: { plotNumber: "asc" },
        include: {
          assignedCustomer: { select: { fullName: true } },
          block: { select: { name: true } },
        },
      },
      layoutMaps: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          shapes: {
            include: {
              plot: { select: { id: true, plotNumber: true, status: true } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();
  const layout = project.layoutMaps[0];

  const shapes =
    layout?.shapes.map((s) => ({
      id: s.id,
      plotId: s.plot.id,
      plotNumber: s.plot.plotNumber,
      status: s.plot.status,
      coordinates: (Array.isArray(s.coordinates) ? s.coordinates : []) as [number, number][],
      labelX: s.labelX != null ? Number(s.labelX) : null,
      labelY: s.labelY != null ? Number(s.labelY) : null,
    })) ?? [];

  const imageUrl = mediaUrl(layout?.imagePath);
  const legendEntries = Object.entries(PLOT_STATUS_COLORS).filter(
    ([k]) => k !== "CANCELLED" && k !== "BOOKED",
  );

  return (
    <div>
      <MobileHeader
        title="Layout View"
        backHref="/projects"
        right={
          <div className="flex items-center gap-0.5">
            <Link
              href={`/projects/${id}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink)]"
              aria-label="Refresh"
            >
              <RefreshCw size={16} />
            </Link>
            <Link
              href={
                statusFilter
                  ? `/projects/${id}`
                  : `/projects/${id}?status=AVAILABLE`
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink)]"
              aria-label="Filter available"
            >
              <Filter size={16} />
            </Link>
          </div>
        }
      />

      <p className="mb-2 text-[14px] font-semibold text-[var(--ink)]">{project.name}</p>

      <LayoutMapViewer
        imageUrl={imageUrl}
        imageWidth={layout?.originalWidth ?? 1000}
        imageHeight={layout?.originalHeight ?? 700}
        shapes={shapes}
        statusFilter={statusFilter}
      />

      <div className="mt-2 mb-3 grid grid-cols-4 gap-x-1 gap-y-1.5 px-0.5">
        {legendEntries.map(([k, v]) => (
          <Link
            key={k}
            href={
              statusFilter === k ? `/projects/${id}` : `/projects/${id}?status=${k}`
            }
            className={`inline-flex items-center gap-1 text-[10px] ${
              statusFilter === k ? "font-bold text-[var(--ink)]" : "text-muted-foreground"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: v.hex }} />
            {v.label}
          </Link>
        ))}
      </div>

      {project.plots.length === 0 ? (
        <EmptyState message="No plots available" />
      ) : (
        <div className="m-card px-3">
          {project.plots.map((p) => (
            <Link key={p.id} href={`/plots/${p.id}`} className="list-row">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">
                  {p.plotNumber}
                  {p.block?.name ? (
                    <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                      {p.block.name}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatINR(Number(p.totalPrice))}
                  {p.assignedCustomer ? ` · ${p.assignedCustomer.fullName}` : ""}
                </p>
              </div>
              <PlotStatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
