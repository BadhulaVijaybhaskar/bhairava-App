import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { signedUploadUrl } from "@/lib/signed-url";
import { LayoutMapEditor } from "@/components/projects/layout-map-editor";
import { FlashToast } from "@/components/ui/flash-toast";
import type { PlotStatus } from "@prisma/client";

export default async function ProjectLayoutEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      plots: {
        where: { deletedAt: null },
        orderBy: { plotNumber: "asc" },
        select: { id: true, plotNumber: true, status: true },
      },
      layoutMaps: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          shapes: {
            include: { plot: { select: { id: true, plotNumber: true, status: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();
  const layout = project.layoutMaps[0];
  if (!layout) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-10 text-center">
        <p className="font-semibold text-foreground">No layout image yet</p>
        <p className="text-sm text-muted-foreground">Upload a master layout from project edit first.</p>
        <Link href={`/admin/projects/${id}/edit`} className="btn-primary inline-flex px-4 py-2">
          Edit project
        </Link>
      </div>
    );
  }

  const shapes = layout.shapes.map((s) => ({
    id: s.id,
    plotId: s.plotId,
    plotNumber: s.plot.plotNumber,
    status: s.plot.status as PlotStatus,
    shapeType: s.shapeType as "RECT" | "POLYGON",
    coordinates: (Array.isArray(s.coordinates) ? s.coordinates : []) as [number, number][],
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/admin/projects/${id}`} className="rounded-lg p-2 text-primary hover:bg-canvas">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Layout editor</h1>
          <p className="text-sm text-muted-foreground">{project.name} — draw and link plots</p>
        </div>
      </div>

      {sp.saved === "1" ? <FlashToast message="Shape saved." /> : null}
      {sp.deleted === "1" ? <FlashToast message="Shape removed." /> : null}
      {sp.error === "shape" ? (
        <FlashToast variant="error" message="Invalid shape coordinates." />
      ) : null}
      {sp.error === "plot" ? (
        <FlashToast variant="error" message="Plot not found on this project." />
      ) : null}

      <LayoutMapEditor
        projectId={project.id}
        layoutMapId={layout.id}
        imageUrl={signedUploadUrl(layout.imagePath)}
        imageWidth={layout.originalWidth}
        imageHeight={layout.originalHeight}
        plots={project.plots.map((p) => ({
          id: p.id,
          plotNumber: p.plotNumber,
          status: p.status,
        }))}
        shapes={shapes}
      />
    </div>
  );
}
