import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Receipt, Wallet, Clock, FileText, Settings2, CheckCheck } from "lucide-react";
import { PageHeader, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { notifications as seedNotifications, type NotificationItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Bhairava" },
      { name: "description", content: "Chronological inbox of bookings, payments and system events." },
      { property: "og:title", content: "Notifications — Bhairava" },
      { property: "og:description", content: "Chronological inbox of bookings, payments and system events." },
    ],
  }),
  component: NotificationsPage,
});

const tabs = ["All", "Unread", "Bookings", "Payments", "System"] as const;
type Tab = (typeof tabs)[number];

const kindIcon: Record<NotificationItem["kind"], typeof Receipt> = {
  booking: Receipt,
  payment: Wallet,
  reservation: Clock,
  document: FileText,
  system: Settings2,
};

const tabToKind: Partial<Record<Tab, NotificationItem["kind"]>> = {
  Bookings: "booking",
  Payments: "payment",
  System: "system",
};

function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("All");
  const [items, setItems] = useState<NotificationItem[]>(seedNotifications);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (tab === "Unread") return n.unread;
      const kind = tabToKind[tab];
      if (kind) return n.kind === kind;
      return true;
    });
  }, [items, tab]);

  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        description="Every booking, payment and system event across the org, newest first."
        actions={
          <Btn variant="tonal" onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}>
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
              <span className="numeric ml-1.5 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] text-primary">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="panel divide-y divide-transparent overflow-hidden p-0">
        {filtered.map((n) => {
          const Icon = kindIcon[n.kind];
          return (
            <button
              key={n.id}
              onClick={() =>
                setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
              }
              className={cn(
                "flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-surface-low",
                n.unread && "bg-surface-c/70",
              )}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-highest">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  <p className={cn("truncate text-sm", n.unread ? "font-semibold" : "font-medium text-foreground/90")}>
                    {n.title}
                  </p>
                </div>
                <p className="truncate pt-0.5 text-xs text-muted-foreground">{n.detail}</p>
              </div>
              <span className="numeric shrink-0 pt-0.5 text-[11px] text-muted-foreground">{n.time}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Nothing here.</div>
        )}
      </div>
    </AppShell>
  );
}
