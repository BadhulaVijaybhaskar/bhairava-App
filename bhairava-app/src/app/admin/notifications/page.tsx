import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatIndianDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterOption,
} from "@/components/ui";

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All" },
  { key: "unread", label: "Unread" },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const filter = sp.filter === "unread" ? "unread" : "";

  const items = await prisma.notification.findMany({
    where: {
      organizationId: session.orgId,
      userId: session.sub,
      ...(filter === "unread" ? { isRead: false } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Mark unread as read only when browsing the full (or search) list — not while filtering unread
  if (filter !== "unread") {
    await prisma.notification.updateMany({
      where: { userId: session.sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/notifications"
          placeholder="Search notifications"
          initialQ={q}
          initialFilter={filter}
          filters={FILTERS}
        />
      </Suspense>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" />}
          title={q || filter ? "No matches" : "No notifications yet"}
          description={
            q || filter
              ? "Try a different search or filter."
              : "Follow-ups, interest alerts, and other admin notices appear here."
          }
        />
      ) : (
        <div className="overflow-hidden">
          <ul className="space-y-0">
            {items.map((n) => {
              const body = (
                <div className="flex items-start gap-3 px-3 py-2.5">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      n.isRead ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatIndianDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.linkUrl ? (
                    <Link href={n.linkUrl} className="block hover:bg-[var(--surface-low)]/20">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
