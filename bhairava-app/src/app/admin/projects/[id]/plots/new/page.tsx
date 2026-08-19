import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PlotCreateForm } from "@/components/plots/plot-create-form";

export default async function NewPlotPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id: projectId } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href={`/admin/projects/${project.id}`} className="text-sm font-semibold text-primary">
          ← {project.name}
        </Link>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">Add plots</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create one plot or bulk-generate a list</p>
      </div>

      <PlotCreateForm projectId={project.id} projectName={project.name} error={sp.error} />
    </div>
  );
}
