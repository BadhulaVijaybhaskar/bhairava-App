import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Mail, MapPin, Phone, Plus, UsersRound } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  FUNNEL_PILL,
  resolveFunnelStage,
  type FunnelStage,
} from "@/lib/customer-funnel";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { ContactAction } from "@/components/customers/contact-action";
import { CustomerSearchBar } from "@/components/customers/customer-search-bar";
import { EmptyState, ListSearchBarFallback } from "@/components/ui";

const FUNNEL_FILTERS = new Set<FunnelStage>([
  "Interest",
  "Booked",
  "Registered",
  "Resale",
]);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function FunnelStatusPill({
  plots,
  bookings,
  interests,
}: {
  plots: { id: string; status: string; resaleStatus: boolean }[];
  bookings: { bookingStatus: string; plotId: string }[];
  interests: { type: string; plotId: string }[];
}) {
  const funnel = resolveFunnelStage({ plots, bookings, interests });
  if (!funnel.stage) {
    return <span className="text-sm font-medium text-muted-foreground">None yet</span>;
  }
  return (
    <span
      className={cn(
        "status-pill inline-flex items-center gap-1",
        FUNNEL_PILL[funnel.stage],
      )}
    >
      {funnel.stage}
      {funnel.count > 1 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bhairava-deep)]/15 px-1 text-[10px] font-bold">
          {funnel.count}
        </span>
      ) : null}
    </span>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filterRaw = (sp.filter || "").trim();
  const filter = FUNNEL_FILTERS.has(filterRaw as FunnelStage)
    ? (filterRaw as FunnelStage)
    : "";

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { mobile: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      plots: {
        where: { deletedAt: null },
        select: { id: true, status: true, resaleStatus: true },
      },
      bookings: {
        where: { deletedAt: null },
        select: { bookingStatus: true, plotId: true },
      },
    },
  });

  const customerIds = customers.map((c) => c.id);
  const interests =
    customerIds.length === 0
      ? []
      : await prisma.plotInterest.findMany({
          where: {
            organizationId: session.orgId,
            customerId: { in: customerIds },
            type: { in: ["INTERESTED", "CALLBACK_REQUEST", "WAITLIST", "OFFER"] },
          },
          select: { customerId: true, type: true, plotId: true },
        });

  const interestsByCustomer = new Map<string, { type: string; plotId: string }[]>();
  for (const i of interests) {
    if (!i.customerId) continue;
    const list = interestsByCustomer.get(i.customerId) ?? [];
    list.push({ type: i.type, plotId: i.plotId });
    interestsByCustomer.set(i.customerId, list);
  }

  const filtered = filter
    ? customers.filter((c) => {
        const funnel = resolveFunnelStage({
          plots: c.plots,
          bookings: c.bookings,
          interests: interestsByCustomer.get(c.id) ?? [],
        });
        return funnel.stage === filter;
      })
    : customers;

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href="/admin/customers/new" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          New customer
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <CustomerSearchBar initialQ={q} initialFilter={filter} />
      </Suspense>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-7 w-7" />}
          title={q || filter ? "No matches" : "No customers yet"}
          description={
            q || filter
              ? "Try a different search or filter."
              : "Add a customer to start bookings."
          }
          action={
            !q && !filter ? (
              <Link href="/admin/customers/new" className="btn-primary px-3.5 py-2">
                Add first customer
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
                  <th>Contact</th>
                  <th>Mail</th>
                  <th>Location</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const place = [c.city, c.state].filter(Boolean).join(", ");
                  const funnelProps = {
                    plots: c.plots,
                    bookings: c.bookings,
                    interests: interestsByCustomer.get(c.id) ?? [],
                  };
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="flex min-w-[220px] items-center gap-2.5 hover:text-primary"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                            {initials(c.fullName) || "?"}
                          </span>
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <span className="truncate font-semibold text-foreground">
                              {c.fullName}
                            </span>
                            <span className="shrink-0">
                              <FunnelStatusPill {...funnelProps} />
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <ContactAction
                          href={`tel:+91${c.mobile}`}
                          title={`Call ${c.mobile}`}
                          className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <Phone className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
                          {c.mobile}
                        </ContactAction>
                      </td>
                      <td>
                        {c.email ? (
                          <ContactAction
                            href={`mailto:${c.email}`}
                            title={`Email ${c.email}`}
                            className="inline-flex w-fit max-w-[220px] items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                          >
                            <Mail
                              className="h-3.5 w-3.5 shrink-0 text-sky-600"
                              strokeWidth={2.4}
                            />
                            <span className="truncate">{c.email}</span>
                          </ContactAction>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
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
                      <td className="text-right">
                        <FunnelStatusPill {...funnelProps} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {filtered.map((c) => {
              const place = [c.city, c.state].filter(Boolean).join(", ");
              const funnelProps = {
                plots: c.plots,
                bookings: c.bookings,
                interests: interestsByCustomer.get(c.id) ?? [],
              };
              return (
                <li key={c.id}>
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white"
                    >
                      {initials(c.fullName) || "?"}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="min-w-0 truncate text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {c.fullName}
                        </Link>
                        <span className="shrink-0">
                          <FunnelStatusPill {...funnelProps} />
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <ContactAction
                          href={`tel:+91${c.mobile}`}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
                        >
                          <Phone className="h-3 w-3" />
                          {c.mobile}
                        </ContactAction>
                        {c.email ? (
                          <ContactAction
                            href={`mailto:${c.email}`}
                            className="inline-flex max-w-full items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </ContactAction>
                        ) : null}
                      </div>
                      {place ? (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">{place}</p>
                      ) : null}
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
