import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Plus, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { formatIndianDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/ui/flash-toast";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterOption,
} from "@/components/ui";
import { setUserRole, toggleUserStatus } from "./actions";

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All statuses" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; saved?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filterRaw = (sp.filter || "").toLowerCase();
  const filter =
    filterRaw === "active" || filterRaw === "suspended" ? filterRaw : "";

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        ...(filter === "active"
          ? { status: "ACTIVE" }
          : filter === "suspended"
            ? { status: "SUSPENDED" }
            : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { mobile: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        userRoles: {
          include: { role: { select: { id: true, name: true, code: true } } },
        },
      },
    }),
    prisma.role.findMany({
      where: {
        OR: [{ organizationId: session.orgId }, { organizationId: null }],
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const hasFilters = Boolean(q || filter);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {sp.saved === "1" ? <FlashToast message="User saved." /> : null}

      <div className="flex justify-end">
        <Link href="/admin/users/new" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          New user
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/users"
          placeholder="Search users"
          initialQ={q}
          initialFilter={filter}
          filters={FILTERS}
        />
      </Suspense>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={hasFilters ? "No matches" : "No users yet"}
          description={
            hasFilters
              ? "Try a different search or filter."
              : "Admin users with roles appear here."
          }
        />
      ) : (
        <div className="overflow-hidden">
          <div className="hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Roles</th>
                  <th>Last login</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === session.sub;
                  const active = u.status === "ACTIVE";
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex min-w-[200px] items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                            {initials(u.fullName) || "?"}
                          </span>
                          <span className="truncate font-semibold text-foreground">
                            {u.fullName}
                            {isSelf ? (
                              <span className="ml-1 text-xs font-medium text-muted-foreground">(you)</span>
                            ) : null}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{u.email || "—"}</p>
                        {u.mobile ? <p className="text-xs">{u.mobile}</p> : null}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        <form action={setUserRole} className="flex max-w-[220px] items-center gap-1">
                          <input type="hidden" name="userId" value={u.id} />
                          <select
                            name="roleId"
                            defaultValue={u.userRoles[0]?.role.id ?? ""}
                            className="input-field !py-1.5 !pl-2 text-xs"
                          >
                            <option value="">No role</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="shrink-0 text-xs font-semibold text-primary hover:underline"
                          >
                            Set
                          </button>
                        </form>
                      </td>
                      <td className="whitespace-nowrap text-sm text-muted-foreground">
                        {u.lastLoginAt ? formatIndianDateTime(u.lastLoginAt) : "—"}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span
                            className={cn(
                              "status-pill",
                              active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-[var(--surface-low)] text-muted-foreground",
                            )}
                          >
                            {active ? "Active" : "Suspended"}
                          </span>
                          {!isSelf ? (
                            <form action={toggleUserStatus}>
                              <input type="hidden" name="id" value={u.id} />
                              <button
                                type="submit"
                                className="text-xs font-semibold text-primary hover:underline"
                              >
                                {active ? "Suspend" : "Activate"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {users.map((u) => {
              const active = u.status === "ACTIVE";
              return (
                <li key={u.id} className="flex items-start gap-3 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {initials(u.fullName) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.fullName}
                      </p>
                      <span
                        className={cn(
                          "status-pill shrink-0",
                          active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[var(--surface-low)] text-muted-foreground",
                        )}
                      >
                        {active ? "Active" : "Suspended"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{u.email || u.mobile || "—"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {u.userRoles.map((r) => r.role.name).join(" · ") || "No roles"}
                    </p>
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
