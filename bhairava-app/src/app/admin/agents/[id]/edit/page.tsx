import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateAgent } from "../../actions";
import { AgentForm } from "../../agent-form";

export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const [agent, projects] = await Promise.all([
    prisma.agent.findFirst({
      where: { id, organizationId: session.orgId, deletedAt: null },
      include: { projects: { select: { projectId: true } } },
    }),
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, city: true },
    }),
  ]);

  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <AgentForm
        action={updateAgent}
        projects={projects}
        error={sp.error}
        saved={sp.saved === "1"}
        submitLabel="Save agent"
        backHref={`/admin/agents/${agent.id}`}
        defaults={{
          id: agent.id,
          fullName: agent.fullName,
          mobile: agent.mobile,
          email: agent.email,
          employeeCode: agent.employeeCode,
          isActive: agent.isActive,
          projectIds: agent.projects.map((p) => p.projectId),
        }}
      />
    </div>
  );
}
