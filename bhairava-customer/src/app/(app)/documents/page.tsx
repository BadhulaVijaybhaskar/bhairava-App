import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileHeader } from "@/components/mobile/mobile-header";

const DOC_COLORS = ["#6d28d9", "#2563eb", "#16a34a", "#ea580c", "#db2777", "#0891b2", "#ca8a04", "#4f46e5"];

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const tab = sp.tab === "project" ? "project" : "plot";

  const docs = session.customerId
    ? await prisma.document.findMany({
        where: {
          organizationId: session.orgId,
          deletedAt: null,
          OR:
            tab === "project"
              ? [{ entityType: "PROJECT" }, { projectId: { not: null }, customerId: null }]
              : [{ customerId: session.customerId }, { entityType: "PLOT" }, { entityType: "BOOKING" }],
        },
        include: {
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  // Prefer customer-linked docs for plot tab
  const filtered =
    tab === "plot" && session.customerId
      ? await prisma.document.findMany({
          where: { customerId: session.customerId, deletedAt: null },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        })
      : docs;

  return (
    <div>
      <MobileHeader title="Documents" backHref="/dashboard" />

      <div className="tab-bar -mx-4 mb-3 px-4">
        <Link href="/documents?tab=plot" className={tab === "plot" ? "active" : undefined}>
          Plot Documents
        </Link>
        <Link href="/documents?tab=project" className={tab === "project" ? "active" : undefined}>
          Project Documents
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">
          No documents uploaded yet
        </div>
      ) : (
        <div className="m-card px-3">
          {filtered.map((d, i) => {
            const v = d.versions[0];
            const color = DOC_COLORS[i % DOC_COLORS.length];
            return (
              <div key={d.id} className="list-row">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: color }}
                >
                  <FileText size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{d.title}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {v?.mimeType?.includes("pdf") ? "PDF" : "File"}
                    {" · "}
                    {d.createdAt.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {v?.storagePath ? (
                  <a
                    href={v.storagePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--brand)]"
                    aria-label="Download"
                  >
                    <Download size={16} />
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
