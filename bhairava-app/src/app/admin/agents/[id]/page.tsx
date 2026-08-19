import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/bookings";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/ui/flash-toast";
import { CustomerContactLines } from "@/components/customers/customer-profile-interactive";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AgentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const agent = await prisma.agent.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      projects: {
        include: {
          project: {
            select: { id: true, name: true, code: true, city: true, state: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      bookings: {
        where: { deletedAt: null },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          plot: { select: { plotNumber: true } },
          project: { select: { name: true } },
          customer: { select: { fullName: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
  });

  if (!agent) notFound();

  const detailRows: { key: string; label: string; value: string; href?: string }[] = [
    { key: "name", label: "Name", value: agent.fullName },
  ];
  if (agent.employeeCode) {
    detailRows.push({ key: "code", label: "Employee code", value: agent.employeeCode });
  }
  detailRows.push({
    key: "projects",
    label: "Projects",
    value:
      agent.projects.length === 0
        ? "None assigned"
        : `${agent.projects.length} assigned`,
  });
  detailRows.push({
    key: "bookings",
    label: "Bookings",
    value: String(agent._count.bookings),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-1 sm:px-0">
      <div className="flex items-center gap-1 py-1">
        <Link
          href="/admin/agents"
          className="rounded-lg p-2 text-primary hover:bg-canvas"
          aria-label="Back to agents"
          title="Back to agents"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1" />
        <Link
          href={`/admin/agents/${agent.id}/edit`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-canvas hover:text-primary"
          title="Edit agent details"
          aria-label="Edit agent details"
        >
          <Pencil className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {sp.saved === "1" ? <FlashToast message="Agent saved." /> : null}

      <section className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-5 lg:col-span-7">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-foreground">
              {initials(agent.fullName) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <CustomerContactLines mobile={agent.mobile} email={agent.email} />
            </div>
          </div>

          <div className="space-y-2.5">
            {detailRows.map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-sm text-muted-foreground">{row.label}</span>
                <div className="min-w-0 text-right text-sm font-semibold text-foreground">
                  {row.href ? (
                    <Link href={row.href} className="hover:text-primary">
                      {row.value}
                    </Link>
                  ) : (
                    <span className="whitespace-pre-wrap">{row.value}</span>
                  )}
                </div>
              </div>
            ))}

            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 pt-0.5 text-sm text-muted-foreground">Status</span>
              <span
                className={cn(
                  "status-pill",
                  agent.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-[var(--surface-low)] text-muted-foreground",
                )}
              >
                {agent.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <aside className="space-y-5 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-8">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Assigned projects
            </h3>
            {agent.projects.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No projects assigned yet.</p>
            ) : (
              <ul className="mt-2 space-y-0">
                {agent.projects.map((a) => {
                  const place = [a.project.city, a.project.state].filter(Boolean).join(", ");
                  return (
                    <li key={a.project.id}>
                      <Link
                        href={`/admin/projects/${a.project.id}`}
                        className="flex items-start justify-between gap-3 py-2.5 hover:text-primary"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {a.project.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.project.code}
                            {place ? ` · ${place}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary">Open</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Recent bookings
            </h3>
            {agent.bookings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <ul className="mt-2 space-y-0">
                {agent.bookings.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex items-start justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {b.plot.plotNumber}
                          <span className="font-medium text-muted-foreground"> · {b.project.name}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {b.customer.fullName} · {formatIndianDate(b.bookingDate)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatINR(Number(b.finalAmount))}
                        </p>
                        <span
                          className={cn(
                            "status-pill !px-1.5 !py-0 text-[10px]",
                            BOOKING_STATUS_STYLES[b.bookingStatus],
                          )}
                        >
                          {BOOKING_STATUS_LABELS[b.bookingStatus]}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
