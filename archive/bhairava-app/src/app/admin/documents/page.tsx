import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { DocumentCategory, DocumentEntityType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { FlashToast } from "@/components/ui/flash-toast";
import { signedUploadUrl } from "@/lib/signed-url";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterGroup,
} from "@/components/ui";

const ENTITY_LABELS: Record<DocumentEntityType, string> = {
  PROJECT: "Project",
  PLOT: "Plot",
  CUSTOMER: "Customer",
  BOOKING: "Booking",
  PAYMENT: "Payment",
  REGISTRATION: "Registration",
  RESALE: "Resale",
  ORGANIZATION: "Organization",
};

const CATEGORIES = Object.values(DocumentCategory);

function prettyCategory(c: DocumentCategory) {
  return c.replaceAll("_", " ");
}

function entityHref(d: {
  entityType: DocumentEntityType;
  entityId: string;
  projectId: string | null;
  plotId: string | null;
  customerId: string | null;
  bookingId: string | null;
}) {
  if (d.customerId) return `/admin/customers/${d.customerId}`;
  if (d.bookingId) return `/admin/bookings/${d.bookingId}`;
  if (d.plotId) return `/admin/plots/${d.plotId}${d.projectId ? `?projectId=${d.projectId}` : ""}`;
  if (d.projectId) return `/admin/projects/${d.projectId}`;
  return null;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    filter?: string;
    entity?: string;
    saved?: string;
    error?: string;
    customerId?: string;
    title?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const category = (sp.filter || "").trim() as DocumentCategory | "";
  const entity = (sp.entity || "").trim() as DocumentEntityType | "";

  const [documents, customers, projects, plots, bookings] = await Promise.all([
    prisma.document.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...(category ? { category } : {}),
        ...(entity ? { entityType: entity } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { project: { name: { contains: q, mode: "insensitive" } } },
                { customer: { fullName: { contains: q, mode: "insensitive" } } },
                { plot: { plotNumber: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { name: true } },
        plot: { select: { plotNumber: true } },
        customer: { select: { fullName: true } },
        booking: { select: { bookingNumber: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { originalName: true, sizeBytes: true, storagePath: true },
        },
      },
    }),
    prisma.customer.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
      take: 200,
    }),
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.plot.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { plotNumber: "asc" },
      select: { id: true, plotNumber: true, projectId: true },
      take: 500,
    }),
    prisma.booking.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, bookingNumber: true },
      take: 200,
    }),
  ]);

  const filterGroups: ListFilterGroup[] = [
    {
      param: "filter",
      label: "Category",
      value: category,
      options: [
        { key: "", label: "All categories" },
        ...CATEGORIES.map((c) => ({
          key: c,
          label: prettyCategory(c),
        })),
      ],
    },
    {
      param: "entity",
      label: "Linked to",
      value: entity,
      options: [
        { key: "", label: "All types" },
        ...Object.values(DocumentEntityType).map((key) => ({
          key,
          label: ENTITY_LABELS[key],
        })),
      ],
    },
  ];

  const hasFilters = Boolean(q || category || entity);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {sp.saved === "1" ? <FlashToast message="Document uploaded." /> : null}
      {sp.error === "required" ? (
        <FlashToast variant="error" message="Title and file are required." />
      ) : null}
      {sp.error === "invalid_type" ? (
        <FlashToast variant="error" message="Unsupported file type." />
      ) : null}
      {sp.error === "too_large" ? (
        <FlashToast variant="error" message="File must be under 20 MB." />
      ) : null}
      {sp.error === "entity" || sp.error === "upload" ? (
        <FlashToast variant="error" message="Could not upload document." />
      ) : null}

      <DocumentUploadForm
        customers={customers}
        projects={projects}
        plots={plots}
        bookings={bookings}
        defaultCustomerId={sp.customerId}
        defaultTitle={sp.title}
      />

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/documents"
          placeholder="Search documents"
          initialQ={q}
          filterGroups={filterGroups}
        />
      </Suspense>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No documents yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Documents uploaded on customers, bookings, and projects appear here."
          }
        />
      ) : (
        <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Linked to</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const href = entityHref(d);
                  const linked =
                    d.customer?.fullName ||
                    d.booking?.bookingNumber ||
                    (d.plot ? `${d.plot.plotNumber}${d.project ? ` · ${d.project.name}` : ""}` : null) ||
                    d.project?.name ||
                    ENTITY_LABELS[d.entityType];
                  const inner = (
                    <span className="flex min-w-[200px] items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">
                          {d.title}
                        </span>
                        {d.versions[0] ? (
                          <a
                            href={signedUploadUrl(d.versions[0].storagePath)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-xs text-primary hover:underline"
                          >
                            {d.versions[0].originalName}
                          </a>
                        ) : null}
                      </span>
                    </span>
                  );
                  return (
                    <tr key={d.id}>
                      <td>
                        {href ? (
                          <Link href={href} className="hover:text-primary">
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                      </td>
                      <td className="text-sm text-muted-foreground">{prettyCategory(d.category)}</td>
                      <td className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {ENTITY_LABELS[d.entityType]}
                        </span>
                        <span className="text-border"> · </span>
                        {linked}
                      </td>
                      <td className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatIndianDate(d.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {documents.map((d) => {
              const href = entityHref(d);
              const row = (
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {prettyCategory(d.category)} · {ENTITY_LABELS[d.entityType]}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={d.id}>
                  {href ? <Link href={href}>{row}</Link> : row}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
