import Link from "next/link";
import { redirect } from "next/navigation";
import type { DocumentCategory } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { signedUploadUrl } from "@/lib/signed-url";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { DocumentRow } from "@/components/mobile/document-row";
import { EmptyState } from "@/components/mobile/empty-state";
import { PlotStatusBadge } from "@/components/mobile/status-badge";

const PLOT_CHECKLIST: { title: string; category: DocumentCategory }[] = [
  { title: "Booking Form", category: "BOOKING_FORM" },
  { title: "ID Proof", category: "AADHAAR" },
  { title: "Address Proof", category: "ADDRESS_PROOF" },
  { title: "Agreement", category: "AGREEMENT" },
  { title: "Sale Deed", category: "SALE_DEED" },
  { title: "Registration", category: "REGISTRATION_COPY" },
];

export default async function AgentDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    plotId?: string;
    customerId?: string;
    uploaded?: string;
    error?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const tab = sp.tab === "project" ? "project" : "plot";
  const plotId = sp.plotId || "";
  const customerIdParam = sp.customerId || "";

  const bookingCustomers = await prisma.booking.findMany({
    where: { agentId: session.agentId, deletedAt: null },
    select: { customerId: true, plotId: true, projectId: true, id: true },
    distinct: ["customerId"],
  });
  const created = await prisma.customer.findMany({
    where: { organizationId: session.orgId, createdBy: session.sub, deletedAt: null },
    select: { id: true },
  });
  const customerIds = [
    ...new Set([...bookingCustomers.map((b) => b.customerId), ...created.map((c) => c.id)]),
  ];

  const contextBooking =
    plotId || customerIdParam
      ? await prisma.booking.findFirst({
          where: {
            agentId: session.agentId,
            deletedAt: null,
            ...(plotId ? { plotId } : {}),
            ...(customerIdParam ? { customerId: customerIdParam } : {}),
          },
          include: {
            plot: { select: { id: true, plotNumber: true, status: true } },
            project: { select: { id: true, name: true } },
            customer: { select: { id: true, fullName: true } },
          },
          orderBy: { bookingDate: "desc" },
        })
      : null;

  const focusCustomerId = contextBooking?.customer.id || customerIdParam || "";
  const focusPlotId = contextBooking?.plot.id || plotId || "";
  const returnTo = `/documents?tab=plot${focusPlotId ? `&plotId=${focusPlotId}` : ""}${
    focusCustomerId ? `&customerId=${focusCustomerId}` : ""
  }`;

  if (tab === "project") {
    const documents = await prisma.document.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        entityType: "PROJECT",
        project: {
          agentAssignments: { some: { agentId: session.agentId } },
        },
      },
      include: {
        project: { select: { name: true } },
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          select: { storagePath: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return (
      <div>
        <MobileHeader title="Documents" backHref="/more" />
        <DocTabs tab={tab} />
        {documents.length === 0 ? (
          <EmptyState message="No project documents yet" />
        ) : (
          <div className="m-card px-3">
            {documents.map((d) => {
              const ver = d.versions[0];
              return (
                <DocumentRow
                  key={d.id}
                  title={d.title}
                  meta={`${d.project?.name || "Project"} · ${
                    ver
                      ? `Uploaded on ${ver.createdAt.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : "No file"
                  }`}
                  action={ver ? "view" : "na"}
                  viewHref={ver ? signedUploadUrl(ver.storagePath) : null}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Plot documents — checklist when we have customer context, else list
  const docs =
    customerIds.length === 0
      ? []
      : await prisma.document.findMany({
          where: {
            organizationId: session.orgId,
            deletedAt: null,
            customerId: {
              in: focusCustomerId ? [focusCustomerId] : customerIds,
            },
            ...(focusPlotId ? { OR: [{ plotId: focusPlotId }, { plotId: null }] } : {}),
          },
          include: {
            customer: { select: { fullName: true } },
            project: { select: { name: true } },
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
              select: { storagePath: true, createdAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

  const byCategory = new Map(docs.map((d) => [d.category, d]));

  return (
    <div>
      <MobileHeader title="Documents" backHref="/more" />
      <DocTabs tab={tab} />

      {sp.uploaded === "1" ? (
        <p className="mb-2 text-[12px] font-medium text-[var(--brand)]">Document uploaded.</p>
      ) : null}
      {sp.error ? (
        <p className="mb-2 text-[12px] text-[var(--danger)]">Upload failed ({sp.error}).</p>
      ) : null}

      {contextBooking ? (
        <div className="m-card mb-3 flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">
              {contextBooking.plot.plotNumber}, {contextBooking.project.name}
            </p>
            <p className="text-[11px] text-muted-foreground">{contextBooking.customer.fullName}</p>
          </div>
          <PlotStatusBadge status={contextBooking.plot.status} />
        </div>
      ) : null}

      {focusCustomerId ? (
        <div className="m-card px-3">
          {PLOT_CHECKLIST.map((item) => {
            const match =
              byCategory.get(item.category) ||
              (item.category === "AADHAAR" ? byCategory.get("PAN") : undefined);
            const ver = match?.versions[0];
            if (ver) {
              return (
                <DocumentRow
                  key={item.category}
                  title={item.title}
                  meta={`Uploaded on ${ver.createdAt.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`}
                  action="view"
                  viewHref={signedUploadUrl(ver.storagePath)}
                />
              );
            }
            // Sale deed / registration may be N/A until later stages
            if (item.category === "SALE_DEED" || item.category === "REGISTRATION_COPY") {
              return (
                <DocumentRow
                  key={item.category}
                  title={item.title}
                  meta="Not Available"
                  action="na"
                />
              );
            }
            return (
              <DocumentRow
                key={item.category}
                title={item.title}
                meta="Pending Upload"
                action="upload"
                upload={{
                  title: item.title,
                  category: item.category,
                  customerId: focusCustomerId,
                  plotId: focusPlotId || null,
                  bookingId: contextBooking?.id || null,
                  projectId: contextBooking?.project.id || null,
                  returnTo,
                }}
              />
            );
          })}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          message="No documents uploaded"
          action={
            <Link href="/customers" className="text-[13px] font-semibold text-[var(--brand)]">
              Open a customer to manage plot documents
            </Link>
          }
        />
      ) : (
        <div className="m-card px-3">
          {docs.map((d) => {
            const ver = d.versions[0];
            return (
              <DocumentRow
                key={d.id}
                title={d.title}
                meta={`${d.customer?.fullName || d.project?.name || "—"} · ${d.category}`}
                action={ver ? "view" : "na"}
                viewHref={ver ? signedUploadUrl(ver.storagePath) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocTabs({ tab }: { tab: string }) {
  return (
    <div className="tab-bar -mx-4 mb-3 px-4">
      <Link href="/documents?tab=project" className={tab === "project" ? "active" : undefined}>
        Project Documents
      </Link>
      <Link href="/documents?tab=plot" className={tab === "plot" ? "active" : undefined}>
        Plot Documents
      </Link>
    </div>
  );
}
