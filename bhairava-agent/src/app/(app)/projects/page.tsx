import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { ProjectsSearchFilter } from "@/components/mobile/filter-sheet";
import { EmptyState } from "@/components/mobile/empty-state";
import { ProjectsListClient } from "./projects-list-client";

export default async function AgentProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const status = (sp.status || "").trim();

  const assignments = await prisma.agentProjectAssignment.findMany({
    where: {
      agentId: session.agentId,
      project: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          city: true,
          status: true,
          coverImagePath: true,
          _count: { select: { plots: { where: { deletedAt: null } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = assignments.map((a) => ({
    id: a.id,
    href: `/projects/${a.project.id}`,
    name: a.project.name,
    city: a.project.city,
    status: a.project.status,
    plots: a.project._count.plots,
    cover: mediaUrl(a.project.coverImagePath),
  }));

  return (
    <div>
      <MobileHeader title="Projects" showMenu showBell />

      <Suspense fallback={<div className="mb-3 h-11 rounded-xl bg-white" />}>
        <ProjectsSearchFilter defaultQ={q} defaultStatus={status} />
      </Suspense>

      {items.length === 0 ? (
        <EmptyState message="No projects assigned" />
      ) : (
        <ProjectsListClient items={items} />
      )}
    </div>
  );
}
