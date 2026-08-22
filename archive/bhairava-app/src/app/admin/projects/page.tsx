import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MapPin, MapPinned, Plus } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ProjectActiveToggle } from "@/components/projects/project-active-toggle";
import { ProjectSearchBar } from "@/components/projects/project-search-bar";
import {
  EmptyState,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";

type StatusFilter = "" | "active" | "inactive";

function parseStatusFilter(raw?: string): StatusFilter {
  if (raw === "active" || raw === "inactive") return raw;
  return "";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; filter?: string; city?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filter = parseStatusFilter(sp.filter);
  const city = (sp.city || "").trim();

  const statusWhere =
    filter === "active"
      ? { status: "ACTIVE" as ProjectStatus }
      : filter === "inactive"
        ? { status: { not: "ACTIVE" as ProjectStatus } }
        : {};

  const [cityRows, projects] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        city: { not: null },
      },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    }),
    prisma.project.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...statusWhere,
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { code: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { state: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { plots: true } },
        plots: {
          where: { deletedAt: null },
          select: { status: true },
        },
      },
    }),
  ]);

  const cities = cityRows
    .map((r) => r.city?.trim())
    .filter((c): c is string => Boolean(c));

  const filterGroups: ListFilterGroup[] = [
    {
      param: "filter",
      label: "Status",
      value: filter,
      options: [
        { key: "", label: "All statuses" },
        { key: "active", label: "Active" },
        { key: "inactive", label: "Inactive" },
      ],
    },
    {
      param: "city",
      label: "Location",
      value: city,
      options: [
        { key: "", label: "All cities" },
        ...cities.map((c) => ({ key: c, label: c })),
      ],
    },
  ];

  const hasFilters = Boolean(q || filter || city);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href="/admin/projects/new" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ProjectSearchBar initialQ={q} filterGroups={filterGroups} />
      </Suspense>

      {sp.deleted === "1" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Project deleted.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          icon={<MapPinned className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No projects yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Create a project to start adding plots."
          }
          action={
            !hasFilters ? (
              <Link href="/admin/projects/new" className="btn-primary px-3.5 py-2">
                Add first project
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
                  <th>Project</th>
                  <th>Location</th>
                  <th>Code</th>
                  <th>Plots</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const place = [p.city, p.state].filter(Boolean).join(", ");
                  const available = p.plots.filter((x) => x.status === "AVAILABLE").length;
                  const isActive = p.status === "ACTIVE";
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="flex min-w-[200px] items-center gap-2.5 hover:text-primary"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                            {initials(p.name) || "?"}
                          </span>
                          <span className="truncate font-semibold text-foreground">
                            {p.name}
                          </span>
                        </Link>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {place ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate">{place}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-sm font-medium text-foreground">{p.code}</td>
                      <td className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{p._count.plots}</span>
                        <span className="mx-1 text-border">·</span>
                        <span className="text-emerald-700">{available} avail</span>
                      </td>
                      <td className="text-right">
                        <ProjectActiveToggle projectId={p.id} active={isActive} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {projects.map((p) => {
              const place = [p.city, p.state].filter(Boolean).join(", ");
              const available = p.plots.filter((x) => x.status === "AVAILABLE").length;
              const isActive = p.status === "ACTIVE";
              return (
                <li key={p.id}>
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
                    >
                      {initials(p.name) || "?"}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/projects/${p.id}`}
                        className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.code}
                        {place ? ` · ${place}` : ""}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{p._count.plots}</span> plots
                          <span className="mx-1 text-border">·</span>
                          <span className="text-emerald-700">{available} avail</span>
                        </p>
                        <ProjectActiveToggle projectId={p.id} active={isActive} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
