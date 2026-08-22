import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Handshake, Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterOption,
} from "@/components/ui";

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All statuses" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filterRaw = (sp.filter || "").toLowerCase();
  const filter =
    filterRaw === "active" || filterRaw === "inactive" ? filterRaw : "";
  const q = (sp.q || "").trim();

  const agents = await prisma.agent.findMany({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      ...(filter === "active"
        ? { isActive: true }
        : filter === "inactive"
          ? { isActive: false }
          : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { mobile: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
              { employeeCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      projects: {
        include: { project: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { bookings: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href="/admin/agents/new" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          New agent
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/agents"
          placeholder="Search agents"
          initialQ={q}
          initialFilter={filter}
          filters={FILTERS}
        />
      </Suspense>

      {agents.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-7 w-7" />}
          title={q || filter ? "No matches" : "No agents yet"}
          description={
            q || filter
              ? "Try a different search or filter."
              : "Add a sales agent and assign them to projects."
          }
          action={
            !q && !filter ? (
              <Link href="/admin/agents/new" className="btn-primary px-3.5 py-2">
                Add first agent
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Contact</th>
                  <th>Projects</th>
                  <th className="text-right">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id}>
                    <td>
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="flex min-w-[220px] items-center gap-2.5 hover:text-primary"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {initials(agent.fullName) || "?"}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="truncate font-semibold text-foreground">
                            {agent.fullName}
                          </span>
                          <span
                            className={cn(
                              "status-pill shrink-0",
                              agent.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-[var(--surface-low)] text-muted-foreground",
                            )}
                          >
                            {agent.isActive ? "Active" : "Inactive"}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{agent.mobile}</p>
                      {agent.email ? <p className="truncate text-xs">{agent.email}</p> : null}
                      {agent.employeeCode ? (
                        <p className="text-xs">{agent.employeeCode}</p>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] truncate text-sm text-muted-foreground">
                      {agent.projects.length === 0
                        ? "—"
                        : agent.projects.map((p) => p.project.name).join(" · ")}
                    </td>
                    <td className="text-right text-sm font-semibold text-foreground">
                      {agent._count.bookings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {agents.map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/admin/agents/${agent.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {initials(agent.fullName) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {agent.fullName}
                      </p>
                      <span
                        className={cn(
                          "status-pill shrink-0",
                          agent.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[var(--surface-low)] text-muted-foreground",
                        )}
                      >
                        {agent.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{agent.mobile}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {agent._count.bookings} bookings
                      {agent.projects.length
                        ? ` · ${agent.projects.length} projects`
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
