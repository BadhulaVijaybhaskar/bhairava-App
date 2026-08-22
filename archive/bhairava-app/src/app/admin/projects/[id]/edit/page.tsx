import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseHighlights } from "@/lib/project-highlights";
import { updateProject } from "../../actions";
import { ProjectFormBody } from "@/components/projects/project-form-body";
import { ConfirmDeleteProjectForm } from "@/components/projects/confirm-delete-project-form";

const ERRORS: Record<string, string> = {
  "1": "Name and code are required.",
  location: "Select country, state, and city.",
  pincode: "Enter a valid 6-digit pincode.",
  duplicate: "A project with this code already exists.",
  plots: "Enter a valid plot count (0 or more).",
  failed: "Could not save project. Try again.",
  invalid_type: "Layout must be a JPG, PNG, or WebP image.",
  too_large: "Layout image must be under 12 MB.",
  upload: "Could not save the layout image.",
};

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
  });
  if (!project) notFound();

  const errorMsg = sp.error ? ERRORS[sp.error] : null;
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href={`/admin/projects/${project.id}`} className="text-sm font-semibold text-primary">
          ← {project.name}
        </Link>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">Edit project</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update details, highlights, or replace layout</p>
      </div>

      <form action={updateProject} className="surface space-y-5 p-5">
        {errorMsg ? <p className="text-sm font-medium text-red-600">{errorMsg}</p> : null}
        <ProjectFormBody
          mode="edit"
          googleMapsApiKey={googleMapsApiKey}
          defaults={{
            id: project.id,
            name: project.name,
            code: project.code,
            description: project.description,
            reraNumber: project.reraNumber,
            country: "India",
            state: project.state ?? "",
            city: project.city ?? "",
            address: project.address,
            pincode: project.pincode,
            latitude: project.latitude != null ? String(project.latitude) : "",
            longitude: project.longitude != null ? String(project.longitude) : "",
            totalPlots: project.totalPlots,
            status: project.status,
            highlights: parseHighlights(project.highlights),
            coverImagePath: project.coverImagePath,
          }}
        />
        <button type="submit" className="btn-primary w-full py-3">
          Save project
        </button>
      </form>

      <ConfirmDeleteProjectForm projectId={project.id} />
    </div>
  );
}
