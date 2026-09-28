import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, Clock, FileText, Receipt, Wallet, Stamp, Repeat, Ban } from "lucide-react";
import { PageHeader, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { useData } from "@/lib/store";
import { useManagement } from "@/lib/management-store";
import { deriveInAppNotifications } from "@/lib/domain/management-derive";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Bhairava" },
      { name: "description", content: "In-app notifications derived from live workspace events." },
    ],
  }),
  component: NotificationsPage,
});

const tabs = ["All", "Unread"] as const;

const kindIcon: Record<string, typeof Bell> = {
  reservation_expiring: Clock,
  payment_due: Wallet,
  payment_overdue: Wallet,
  document_pending: FileText,
  registration_scheduled: Stamp,
  registration_completed: Stamp,
  booking_created: Receipt,
  cancellation_request: Ban,
  resale_created: Repeat,
};

function NotificationsPage() {
  const data = useData();
  const mgmt = useManagement();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");

  const items = useMemo(
    () =>
      deriveInAppNotifications({
        bookings: data.bookings as never,
        reservations: data.reservations as never,
        cancelRequests: data.cancelRequests as never,
        financePayments: data.financePayments as never,
        paymentSchedules: data.paymentSchedules as never,
        opsDocuments: data.opsDocuments as never,
        opsRegistrations: data.opsRegistrations as never,
        opsResales: data.opsResales as never,
        readIds: mgmt.notificationReadIds,
      }),
    [data, mgmt.notificationReadIds],
  );

  const filtered = useMemo(() => (tab === "Unread" ? items.filter((n) => n.unread) : items), [items, tab]);
  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        description="Derived from reservations, payments, documents, registrations, bookings, cancellations and resales."
        actions={
          <Btn variant="tonal" data-testid="notifications-mark-all" onClick={() => mgmt.markAllNotificationsRead(items.map((n) => n.id))}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Btn>
        }
      />
      <div className="flex flex-wrap items-center gap-2 pb-4">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              t === tab ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c",
            )}
          >
            {t}
            {t === "Unread" && unreadCount > 0 && (
              <span className="numeric ml-1.5 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] text-primary">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>
      <div className="panel divide-y divide-transparent overflow-hidden p-0" data-testid="notifications-list">
        {filtered.map((n) => {
          const Icon = kindIcon[n.kind] || Bell;
          return (
            <button
              key={n.id}
              onClick={() => mgmt.markNotificationRead(n.id)}
              className={cn("flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-low", n.unread && "bg-surface-c/70")}
              data-testid={"notification-" + n.id}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-highest">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className={cn("truncate text-sm", n.unread ? "font-semibold" : "font-medium text-foreground/90")}>{n.title}</p>
                </div>
                <p className="truncate pt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                {n.href ? (
                  <Link to={n.href} className="mt-1 inline-block text-xs text-primary underline">
                    Open
                  </Link>
                ) : null}
              </div>
              <span className="numeric shrink-0 pt-0.5 text-[11px] text-muted-foreground">{n.createdAt.slice(0, 16).replace("T", " ")}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nothing here.</div>}
      </div>
    </AppShell>
  );
}
