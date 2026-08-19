import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import type { PlotStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { parsePlotSpecs } from "@/lib/block-plot-specs";
import { ProjectPlotsShowcase } from "@/components/plots/project-plots-showcase";
import { ProjectBlocksPanel } from "@/components/projects/project-blocks-panel";
import { ProjectHighlightsView } from "@/components/projects/project-highlights-view";
import { ProjectPhasesPanel } from "@/components/projects/project-phases-panel";
import { PlotStatusLegend } from "@/components/status-badge";
import { signedUploadUrl } from "@/lib/signed-url";

const VALID_STATUSES = new Set(Object.keys(PLOT_STATUS_COLORS));

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    layoutError?: string;
    created?: string;
    deleted?: string;
    blockError?: string;
    blockSaved?: string;
    generated?: string;
    projectSaved?: string;
    projectError?: string;
    phaseSaved?: string;
    phaseDeleted?: string;
    phaseError?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const statusFilter =
    sp.status && VALID_STATUSES.has(sp.status) ? (sp.status as PlotStatus) : null;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      plots: {
        where: { deletedAt: null },
        orderBy: { plotNumber: "asc" },
        include: {
          assignedCustomer: { select: { fullName: true } },
          block: { select: { name: true } },
        },
      },
      phases: { where: { deletedAt: null }, orderBy: { sequence: "asc" } },
      blocks: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { plots: { where: { deletedAt: null } } } },
        },
      },
      layoutMaps: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          shapes: {
            include: { plot: { select: { plotNumber: true, status: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const layout = project.layoutMaps[0] ?? null;
  const addPlotsHref = `/admin/projects/${project.id}/plots/new`;

  const counts = project.plots.reduce(
    (acc, plot) => {
      acc[plot.status] = (acc[plot.status] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<PlotStatus, number>>,
  );

  const filtered = statusFilter
    ? project.plots.filter((p) => p.status === statusFilter)
    : project.plots;

  const tiles = filtered.map((plot) => ({
    id: plot.id,
    plotNumber: plot.plotNumber,
    status: plot.status,
    customerName: plot.assignedCustomer?.fullName ?? null,
    blockName: plot.block?.name ?? null,
  }));

  const blockRows = project.blocks.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
    plannedPlots: b.plannedPlots,
    plotCount: b._count.plots,
    specs: parsePlotSpecs(b.plotSpecs),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/projects"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Projects
          </Link>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {project.name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {project.city || "—"}
            {project.state ? `, ${project.state}` : ""} · {project.plots.length} plots
            {project.totalPlots > 0 ? ` (planned ${project.totalPlots})` : ""} ·{" "}
            {project.blocks.length} blocks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/projects/${project.id}/edit`}
            className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-sm"
          >
            <Pencil className="h-4 w-4" />
            Edit project
          </Link>
          <Link
            href={addPlotsHref}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Manual plot
            </span>
          </Link>
          <Link
            href={`/admin/plots?projectId=${project.id}`}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            Plots list
          </Link>
        </div>
      </div>

      {sp.projectSaved === "1" ? (
        <p className="surface px-4 py-3 text-sm font-medium text-emerald-700">Project saved.</p>
      ) : null}
      {sp.projectError === "bookings" ? (
        <p className="surface px-4 py-3 text-sm font-medium text-red-600">
          Cannot delete — this project has active bookings.
        </p>
      ) : null}
      {sp.created ? (
        <p className="surface px-4 py-3 text-sm font-medium text-emerald-700">
          {sp.created} plot{sp.created === "1" ? "" : "s"} created.
        </p>
      ) : null}
      {sp.deleted === "1" ? (
        <p className="surface px-4 py-3 text-sm font-medium text-emerald-700">Plot deleted.</p>
      ) : null}

      {sp.layoutError ? (
        <p className="surface px-4 py-3 text-sm font-medium text-red-600">
          Project created, but layout upload failed
          {sp.layoutError === "invalid_type"
            ? " (use JPG, PNG, or WebP)."
            : sp.layoutError === "too_large"
              ? " (max 12 MB)."
              : "."}{" "}
          You can upload it later.
        </p>
      ) : null}

      {(project.description || project.reraNumber) && (
        <section className="surface p-5">
          {project.description ? (
            <p className="text-sm leading-relaxed text-foreground">{project.description}</p>
          ) : null}
          {project.reraNumber ? (
            <p className={`text-sm text-muted-foreground ${project.description ? "mt-2" : ""}`}>
              RERA: <span className="font-semibold text-foreground">{project.reraNumber}</span>
            </p>
          ) : null}
        </section>
      )}

      <ProjectHighlightsView raw={project.highlights} />

      {layout ? (
        <section className="surface overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Master layout</h3>
              <p className="text-sm text-muted-foreground">
                {layout.shapes.length} plot shape{layout.shapes.length === 1 ? "" : "s"} linked
              </p>
            </div>
            <Link
              href={`/admin/projects/${project.id}/layout`}
              className="btn-primary px-3 py-2 text-sm"
            >
              Open layout editor
            </Link>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUploadUrl(layout.imagePath)}
            alt={`${project.name} master layout`}
            className="max-h-[420px] w-full object-contain bg-[var(--surface-low)]"
          />
        </section>
      ) : (
        <section className="surface p-5">
          <h3 className="text-base font-semibold text-foreground">Master layout</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload a site plan from Edit project, then draw plots.</p>
          <Link href={`/admin/projects/${project.id}/edit`} className="btn-primary mt-3 inline-flex px-3 py-2 text-sm">
            Upload layout
          </Link>
        </section>
      )}

      <ProjectPhasesPanel
        projectId={project.id}
        phases={project.phases.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          sequence: p.sequence,
        }))}
      />

      <ProjectBlocksPanel
        projectId={project.id}
        blocks={blockRows}
        error={sp.blockError}
        saved={sp.blockSaved === "1"}
        generated={sp.generated}
      />

      <section className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Plot availability</h3>
            <p className="text-sm text-muted-foreground">
              After generating from blocks, set area / facing / price per block, then review here.
            </p>
          </div>
        </div>

        {project.plots.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-primary/25 bg-[linear-gradient(180deg,#f7faff,#ffffff)] px-5 py-10 text-center">
            <p className="font-semibold text-foreground">No plots yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add blocks above with planned plot counts, then click Generate.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <PlotStatusLegend
                projectId={project.id}
                activeStatus={statusFilter}
                counts={counts}
              />
            </div>
            <div className="mt-5">
              <ProjectPlotsShowcase plots={tiles} projectId={project.id} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
