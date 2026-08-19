import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createAgent } from "../actions";
import { AgentForm } from "../agent-form";

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    where: { organizationId: session.orgId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, city: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <AgentForm
        action={createAgent}
        projects={projects}
        error={sp.error}
        submitLabel="Create agent"
        backHref="/admin/agents"
      />
    </div>
  );
}
