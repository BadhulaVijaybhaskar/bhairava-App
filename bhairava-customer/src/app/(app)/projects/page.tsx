import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { PLOT_STATUS_COLORS } from "@/lib/constants";

export default async function CustomerProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { organizationId: session.orgId, deletedAt: null, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      status: true,
      _count: { select: { plots: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div>
      <MobileHeader title="Projects" backHref="/more" />
      <p className="mb-3 text-[12px] text-[var(--muted)]">
        View layouts &amp; status. Other buyers&apos; details stay private.
      </p>
      {projects.length === 0 ? (
        <div className="m-card p-6 text-center text-[13px] text-[var(--muted)]">
          No projects available
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="m-card block p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--ink)]">{p.name}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {p._count.plots} plots{p.city ? ` · ${p.city}` : ""}
                  </p>
                </div>
                <span className="m-badge bg-[var(--success-soft)] text-[var(--success)]">
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
