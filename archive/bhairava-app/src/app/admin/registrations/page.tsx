import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import type { RegistrationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  NOT_STARTED: "bg-[var(--surface-low)] text-muted-foreground",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  SCHEDULED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

function mapBookingToRegStatus(
  bookingStatus: string,
  registrationStatus: RegistrationStatus,
): RegistrationStatus {
  if (registrationStatus !== "NOT_STARTED") return registrationStatus;
  if (bookingStatus === "REGISTERED") return "COMPLETED";
  if (bookingStatus === "SOLD" || bookingStatus === "UNDER_DOCUMENTATION") return "IN_PROGRESS";
  if (bookingStatus === "PENDING_DOCS" || bookingStatus === "AGREEMENT") return "IN_PROGRESS";
  return "NOT_STARTED";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function ensureRegistrations(orgId: string) {
  const missing = await prisma.booking.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      registration: null,
      OR: [
        {
          bookingStatus: {
            in: ["AGREEMENT", "PENDING_DOCS", "UNDER_DOCUMENTATION", "SOLD", "REGISTERED"],
          },
        },
        { registrationStatus: { not: "NOT_STARTED" } },
      ],
    },
    select: {
      id: true,
      projectId: true,
      plotId: true,
      customerId: true,
      bookingStatus: true,
      registrationStatus: true,
    },
  });

  if (missing.length === 0) return;

  await prisma.registration.createMany({
    data: missing.map((b) => ({
      organizationId: orgId,
      bookingId: b.id,
      projectId: b.projectId,
      plotId: b.plotId,
      customerId: b.customerId,
      status: mapBookingToRegStatus(b.bookingStatus, b.registrationStatus),
    })),
    skipDuplicates: true,
  });
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureRegistrations(session.orgId);

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filterRaw = (sp.filter || "").trim() as RegistrationStatus | "";
  const filter = filterRaw in STATUS_LABEL ? filterRaw : "";
  const projectId = (sp.projectId || "").trim();

  const [projects, rows] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.registration.findMany({
      where: {
        organizationId: session.orgId,
        ...(filter ? { status: filter } : {}),
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { registrationNumber: { contains: q, mode: "insensitive" } },
                { customer: { fullName: { contains: q, mode: "insensitive" } } },
                { plot: { plotNumber: { contains: q, mode: "insensitive" } } },
                { project: { name: { contains: q, mode: "insensitive" } } },
                { booking: { bookingNumber: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { fullName: true, mobile: true } },
        plot: { select: { plotNumber: true } },
        project: { select: { name: true } },
        booking: { select: { id: true, bookingNumber: true } },
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
        ...(Object.entries(STATUS_LABEL) as [RegistrationStatus, string][]).map(
          ([key, label]) => ({ key, label }),
        ),
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
      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/registrations"
          placeholder="Search registrations"
          initialQ={q}
          filterGroups={filterGroups}
        />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No registrations yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Registrations appear when bookings move into documentation or sale."
          }
          action={
            !hasFilters ? (
              <Link href="/admin/bookings" className="btn-primary px-3.5 py-2">
                Open bookings
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
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Plot / Project</th>
                  <th>Reg. no.</th>
                  <th>Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/admin/registrations/${r.id}`}
                        className="flex min-w-[180px] items-center gap-2.5 hover:text-primary"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {initials(r.customer.fullName) || "?"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">
                            {r.customer.fullName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {r.booking.bookingNumber}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className={cn("status-pill", STATUS_STYLE[r.status])}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{r.plot.plotNumber}</span>
                      <span className="text-border"> · </span>
                      {r.project.name}
                    </td>
                    <td className="text-sm text-muted-foreground">{r.registrationNumber || "—"}</td>
                    <td className="whitespace-nowrap text-sm text-muted-foreground">
                      {r.scheduledDate
                        ? formatIndianDate(r.scheduledDate)
                        : r.completedDate
                          ? formatIndianDate(r.completedDate)
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/registrations/${r.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {initials(r.customer.fullName) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.customer.fullName}
                      </p>
                      <span className={cn("status-pill shrink-0", STATUS_STYLE[r.status])}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.plot.plotNumber} · {r.project.name}
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
