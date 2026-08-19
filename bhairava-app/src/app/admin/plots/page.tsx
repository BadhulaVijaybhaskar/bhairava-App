import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import type { PlotStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";

const VALID_STATUSES = new Set(Object.keys(PLOT_STATUS_COLORS));

export default async function PlotsListPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; status?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const projectId = sp.projectId || "";
  const status =
    sp.status && VALID_STATUSES.has(sp.status) ? (sp.status as PlotStatus) : undefined;
  const q = (sp.q || "").trim();

  const [projects, plots] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.plot.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(q
          ? {
              OR: [
                { plotNumber: { contains: q, mode: "insensitive" } },
                { project: { name: { contains: q, mode: "insensitive" } } },
                { assignedCustomer: { fullName: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: [{ project: { name: "asc" } }, { plotNumber: "asc" }],
      include: {
        project: { select: { id: true, name: true } },
        assignedCustomer: { select: { fullName: true } },
      },
    }),
  ]);

  const addHref = projectId
    ? `/admin/projects/${projectId}/plots/new`
    : projects[0]
      ? `/admin/projects/${projects[0].id}/plots/new`
      : "/admin/projects/new";

  const filterGroups: ListFilterGroup[] = [
    {
      param: "status",
      label: "Status",
      value: status || "",
      options: [
        { key: "", label: "All statuses" },
        ...Object.entries(PLOT_STATUS_COLORS).map(([key, meta]) => ({
          key,
          label: meta.label,
        })),
      ],
    },
    {
      param: "projectId",
      label: "Project",
      value: projectId,
      options: [
        { key: "", label: "All projects" },
        ...projects.map((p) => ({ key: p.id, label: p.name })),
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href={addHref} className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          Add plots
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/plots"
          placeholder="Search plots"
          initialQ={q}
          filterGroups={filterGroups}
        />
      </Suspense>

      {plots.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-7 w-7" />}
          title={q || status || projectId ? "No matches" : "No plots yet"}
          description={
            q || status || projectId
              ? "Try a different search or filter."
              : "Create plots for a project to build your inventory."
          }
          action={
            !q && !status && !projectId ? (
              <Link href={addHref} className="btn-primary px-3.5 py-2">
                Add plots
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
                  <th>Plot</th>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Customer</th>
                  <th className="text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {plots.map((plot) => (
                  <tr key={plot.id}>
                    <td>
                      <Link
                        href={`/admin/plots/${plot.id}?projectId=${plot.project.id}`}
                        className="flex min-w-[140px] items-center gap-2.5 hover:text-primary"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {plot.plotNumber.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate font-semibold text-foreground">
                          {plot.plotNumber}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={plot.status} />
                    </td>
                    <td className="text-sm text-muted-foreground">{plot.project.name}</td>
                    <td className="text-sm text-muted-foreground">
                      {plot.assignedCustomer?.fullName || "—"}
                    </td>
                    <td className="text-right text-sm font-semibold text-foreground">
                      {formatINR(Number(plot.totalPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {plots.map((plot) => (
              <li key={plot.id}>
                <Link
                  href={`/admin/plots/${plot.id}?projectId=${plot.project.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {plot.plotNumber.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {plot.plotNumber}
                        <span className="font-medium text-muted-foreground"> · {plot.project.name}</span>
                      </p>
                      <StatusBadge status={plot.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {plot.assignedCustomer?.fullName || "No customer"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatINR(Number(plot.totalPrice))}
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
