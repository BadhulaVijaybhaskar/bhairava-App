import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { createProject } from "../actions";
import { ProjectFormBody } from "@/components/projects/project-form-body";

const ERRORS: Record<string, string> = {
  "1": "Name and code are required.",
  location: "Select country, state, and city.",
  pincode: "Enter a valid 6-digit pincode.",
  duplicate: "A project with this code already exists.",
  plots: "Enter a valid plot count (0 or more).",
  failed: "Could not create project. Try again.",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const errorMsg = sp.error ? ERRORS[sp.error] : null;
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/admin/projects" className="text-sm font-semibold text-primary">
          ← Projects
        </Link>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">Create project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Location, brochure highlights, optional layout — then add blocks
        </p>
      </div>

      <form action={createProject} className="surface space-y-5 p-5">
        {errorMsg ? <p className="text-sm font-medium text-red-600">{errorMsg}</p> : null}
        <ProjectFormBody mode="create" googleMapsApiKey={googleMapsApiKey} />
        <button type="submit" className="btn-primary w-full py-3">
          Create project
        </button>
      </form>
    </div>
  );
}
