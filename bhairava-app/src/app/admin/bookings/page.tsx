import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";
import { BookingsListClient } from "@/components/bookings/bookings-list-client";
import { Button } from "@/components/ui/button";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; projectId?: string; q?: string; drawer?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filterRaw = (sp.filter || "").toLowerCase();
  const filter =
    filterRaw === "active" || filterRaw === "sold" || filterRaw === "cancelled"
      ? filterRaw
      : "";
  const projectId = (sp.projectId || "").trim();
  const q = (sp.q || "").trim();

  const statusFilter =
    filter === "active"
      ? {
          bookingStatus: {
            in: [
              "RESERVED",
              "BOOKED",
              "AGREEMENT",
              "PENDING_DOCS",
              "UNDER_DOCUMENTATION",
            ] as import("@prisma/client").BookingStatus[],
          },
        }
      : filter === "sold"
        ? {
            bookingStatus: {
              in: ["SOLD", "REGISTERED"] as import("@prisma/client").BookingStatus[],
            },
          }
        : filter === "cancelled"
          ? { bookingStatus: "CANCELLED" as const }
          : {};

  const [projects, bookings] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.booking.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...statusFilter,
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { bookingNumber: { contains: q, mode: "insensitive" } },
                { customer: { fullName: { contains: q, mode: "insensitive" } } },
                { customer: { mobile: { contains: q } } },
                { plot: { plotNumber: { contains: q, mode: "insensitive" } } },
                { project: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        plot: { select: { plotNumber: true } },
        project: { select: { name: true } },
        customer: { select: { fullName: true, mobile: true } },
        agent: { select: { fullName: true } },
      },
    }),
  ]);

  const filterGroups: ListFilterGroup[] = [
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
        <Link href="/admin/bookings/new">
          <Button className="h-9 gap-1.5 px-3.5">
            <Plus className="size-4" />
            New booking
          </Button>
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/bookings"
          placeholder="Search bookings"
          initialQ={q}
          filterGroups={filterGroups}
        />
      </Suspense>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No bookings yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Book an available plot for a customer."
          }
          action={
            !hasFilters ? (
              <Link href="/admin/bookings/new" className="btn-primary px-3.5 py-2">
                Create booking
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Suspense fallback={null}>
          <BookingsListClient
            filter={filter}
            resultCount={bookings.length}
            items={bookings.map((b) => ({
              id: b.id,
              bookingNumber: b.bookingNumber,
              bookingStatus: b.bookingStatus,
              customerName: b.customer.fullName,
              customerMobile: b.customer.mobile,
              plotNumber: b.plot.plotNumber,
              projectName: b.project.name,
              bookingDateLabel: formatIndianDate(b.bookingDate),
              finalAmount: Number(b.finalAmount),
              bookingAmount: Number(b.bookingAmount),
            }))}
          />
        </Suspense>
      )}
    </div>
  );
}
