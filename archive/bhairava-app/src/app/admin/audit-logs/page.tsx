import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shield } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { formatIndianDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterOption,
} from "@/components/ui";

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All actions" },
  { key: "auth", label: "Auth" },
  { key: "user", label: "Users" },
  { key: "settings", label: "Settings" },
  { key: "interest", label: "Interest" },
];

function filterPrefix(filter: string) {
  if (filter === "auth") return ["auth.", "login", "logout", "password", "refresh"];
  if (filter === "user") return ["user."];
  if (filter === "settings") return ["settings."];
  if (filter === "interest") return ["interest.", "plot_interest"];
  return null;
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filterRaw = (sp.filter || "").toLowerCase();
  const filter = FILTERS.some((f) => f.key === filterRaw) ? filterRaw : "";
  const prefixes = filterPrefix(filter);

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: session.orgId,
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
              { actor: { fullName: { contains: q, mode: "insensitive" } } },
              { actor: { email: { contains: q, mode: "insensitive" } } },
              { ipAddress: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      actor: { select: { fullName: true, email: true } },
    },
  });

  const filtered = prefixes
    ? logs.filter((l) =>
        prefixes.some(
          (p) =>
            l.action.toLowerCase().startsWith(p.toLowerCase()) ||
            l.action.toLowerCase().includes(p.toLowerCase()),
        ),
      )
    : logs;

  const hasFilters = Boolean(q || filter);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/audit-logs"
          placeholder="Search audit logs"
          initialQ={q}
          initialFilter={filter}
          filters={FILTERS}
        />
      </Suspense>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No audit logs yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Login, settings, and other admin actions are recorded here."
          }
        />
      ) : (
        <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatIndianDateTime(l.createdAt)}
                    </td>
                    <td className="text-sm font-semibold text-foreground">{l.action}</td>
                    <td className="text-sm text-muted-foreground">
                      {l.actor?.fullName || "System"}
                      {l.actor?.email ? (
                        <span className="block text-xs">{l.actor.email}</span>
                      ) : null}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {l.entityType || "—"}
                      {l.entityId ? (
                        <span className="block truncate text-xs max-w-[160px]">
                          {l.entityId}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-sm text-muted-foreground">{l.ipAddress || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {filtered.map((l) => (
              <li key={l.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{l.action}</p>
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    {formatIndianDateTime(l.createdAt)}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {l.actor?.fullName || "System"}
                  {l.entityType ? ` · ${l.entityType}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
