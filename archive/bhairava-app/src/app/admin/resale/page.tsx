import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus, RefreshCw } from "lucide-react";
import type { ResaleStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";

const STATUS_STYLE: Record<ResaleStatus, string> = {
  LISTED: "bg-orange-100 text-orange-800",
  UNDER_OFFER: "bg-amber-100 text-amber-800",
  SOLD: "bg-emerald-100 text-emerald-800",
  WITHDRAWN: "bg-[var(--surface-low)] text-muted-foreground",
};

const STATUS_LABEL: Record<ResaleStatus, string> = {
  LISTED: "Listed",
  UNDER_OFFER: "Under offer",
  SOLD: "Sold",
  WITHDRAWN: "Withdrawn",
};

async function ensureResaleListings(orgId: string) {
  const plots = await prisma.plot.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      OR: [{ status: "RESALE_AVAILABLE" }, { resaleStatus: true }],
      resaleListings: { none: { deletedAt: null } },
    },
    select: { id: true, projectId: true, totalPrice: true },
  });

  if (plots.length === 0) return;

  await prisma.resaleListing.createMany({
    data: plots.map((p) => ({
      organizationId: orgId,
      projectId: p.projectId,
      plotId: p.id,
      askingPrice: p.totalPrice,
      status: "LISTED" as const,
    })),
  });
}

export default async function ResalePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureResaleListings(session.orgId);

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filterRaw = (sp.filter || "").trim() as ResaleStatus | "";
  const filter = filterRaw in STATUS_LABEL ? filterRaw : "";
  const projectId = (sp.projectId || "").trim();

  const [projects, listings] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.resaleListing.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...(filter ? { status: filter } : {}),
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { plot: { plotNumber: { contains: q, mode: "insensitive" } } },
                { project: { name: { contains: q, mode: "insensitive" } } },
                { notes: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { listedAt: "desc" },
      include: {
        plot: {
          select: {
            id: true,
            plotNumber: true,
            assignedCustomer: { select: { fullName: true } },
          },
        },
        project: { select: { name: true } },
      },
    }),
  ]);

  const filterGroups: ListFilterGroup[] = [
    {
      param: "filter",
      label: "Status",
      value: filter,
      options: [
        { key: "", label: "All statuses" },
        ...(Object.entries(STATUS_LABEL) as [ResaleStatus, string][]).map(([key, label]) => ({
          key,
          label,
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

  const hasFilters = Boolean(q || filter || projectId);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href="/admin/resale/new" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          New listing
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/resale"
          placeholder="Search resale"
          initialQ={q}
          filterGroups={filterGroups}
        />
      </Suspense>

      {listings.length === 0 ? (
        <EmptyState
          icon={<RefreshCw className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No resale listings yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Create a listing for a sold/registered plot available for resale."
          }
          action={
            !hasFilters ? (
              <Link href="/admin/resale/new" className="btn-primary px-3.5 py-2">
                New listing
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
                  <th>Owner</th>
                  <th>Listed</th>
                  <th className="text-right">Asking</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <Link
                        href={`/admin/resale/${l.id}`}
                        className="flex min-w-[140px] items-center gap-2.5 hover:text-primary"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {l.plot.plotNumber.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate font-semibold text-foreground">
                          {l.plot.plotNumber}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className={cn("status-pill", STATUS_STYLE[l.status])}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{l.project.name}</td>
                    <td className="text-sm text-muted-foreground">
                      {l.plot.assignedCustomer?.fullName || "—"}
                    </td>
                    <td className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatIndianDate(l.listedAt)}
                    </td>
                    <td className="text-right text-sm font-bold text-foreground">
                      {formatINR(Number(l.askingPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/admin/resale/${l.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {l.plot.plotNumber.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {l.plot.plotNumber}
                        <span className="font-medium text-muted-foreground"> · {l.project.name}</span>
                      </p>
                      <span className={cn("status-pill shrink-0", STATUS_STYLE[l.status])}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatINR(Number(l.askingPrice))}
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
