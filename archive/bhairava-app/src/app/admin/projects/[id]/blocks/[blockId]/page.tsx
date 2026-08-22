import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parsePlotSpecs } from "@/lib/block-plot-specs";
import { BlockPlotSpecsForm } from "@/components/projects/block-plot-specs-form";
import { BlockPlotsManageList } from "@/components/projects/block-plots-manage-list";

export default async function BlockBulkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; blockId: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    deleted?: string;
    skipped?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: projectId, blockId } = await params;
  const sp = await searchParams;

  const block = await prisma.projectBlock.findFirst({
    where: {
      id: blockId,
      projectId,
      organizationId: session.orgId,
      deletedAt: null,
    },
    include: {
      project: { select: { id: true, name: true } },
      plots: {
        where: { deletedAt: null },
        orderBy: { plotNumber: "asc" },
        select: {
          id: true,
          plotNumber: true,
          area: true,
          facing: true,
          pricePerSqYard: true,
          additionalCharges: true,
          totalPrice: true,
          status: true,
          bookings: {
            where: { deletedAt: null, bookingStatus: { not: "CANCELLED" } },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  if (!block) notFound();

  const specs = parsePlotSpecs(block.plotSpecs);
  const errors: Record<string, string> = {
    specs: "Add at least one size row with area and plot count.",
    count: "Total plots must be between 1 and 2000.",
    already: "All planned plots are already generated.",
    duplicate: "Plot number conflict — change the block code/prefix.",
    noselect: "Select at least one plot to delete.",
    booked: "Selected plots have active bookings and cannot be deleted.",
  };

  const plotRows = block.plots.map((p) => ({
    id: p.id,
    plotNumber: p.plotNumber,
    area: Number(p.area),
    facing: p.facing,
    pricePerSqYard: p.pricePerSqYard != null ? Number(p.pricePerSqYard) : null,
    additionalCharges: Number(p.additionalCharges),
    totalPrice: Number(p.totalPrice),
    status: p.status,
    locked: p.bookings.length > 0,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href={`/admin/projects/${projectId}`} className="text-sm font-semibold text-primary">
          ← {block.project.name}
        </Link>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">
          {block.name}
          {block.code ? ` (${block.code})` : ""}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define size rows: area (sq.yd) × number of plots, facing, price / sq.yd, extra charge
        </p>
      </div>

      {sp.error && errors[sp.error] ? (
        <p className="surface px-4 py-3 text-sm font-medium text-red-600">{errors[sp.error]}</p>
      ) : null}
      {sp.saved === "1" ? (
        <p className="surface px-4 py-3 text-sm font-medium text-emerald-700">Size rows saved.</p>
      ) : null}
      {sp.deleted ? (
        <p className="surface px-4 py-3 text-sm font-medium text-emerald-700">
          Deleted {sp.deleted} plot{sp.deleted === "1" ? "" : "s"}
          {sp.skipped
            ? ` · skipped ${sp.skipped} with active booking${sp.skipped === "1" ? "" : "s"}`
            : ""}
          .
        </p>
      ) : null}

      <section className="surface space-y-4 p-5">
        <div>
          <h3 className="font-semibold text-foreground">Size &amp; pricing rows</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Example: 200 × 10, 300 × 5, 150 × 10 — then generate plots with these values filled in
          </p>
        </div>
        <BlockPlotSpecsForm
          projectId={projectId}
          blockId={block.id}
          initialSpecs={specs}
          existingPlotCount={block.plots.length}
        />
      </section>

      <section className="surface overflow-hidden">
        <BlockPlotsManageList
          projectId={projectId}
          blockId={block.id}
          plots={plotRows}
        />
      </section>
    </div>
  );
}
