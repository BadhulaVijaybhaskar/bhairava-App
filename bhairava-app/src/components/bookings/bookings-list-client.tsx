"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/bookings";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AnimeStagger } from "@/components/motion/anime-stagger";
import { BookingDrawer } from "@/components/bookings/booking-drawer";
import { MotionTabs } from "@/components/motion/motion-tabs";

export type BookingListItem = {
  id: string;
  bookingNumber: string;
  bookingStatus: keyof typeof BOOKING_STATUS_LABELS;
  customerName: string;
  customerMobile: string;
  plotNumber: string;
  projectName: string;
  bookingDateLabel: string;
  finalAmount: number;
  bookingAmount: number;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function BookingsListClient({
  items,
  filter,
  resultCount,
}: {
  items: BookingListItem[];
  filter: string;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const drawerParam = searchParams.get("drawer");
  const [activeId, setActiveId] = useState<string | null>(drawerParam);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    setActiveId(drawerParam);
  }, [drawerParam]);

  const openDrawer = useCallback(
    (id: string) => {
      setActiveId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("drawer", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeDrawer = useCallback(
    (open: boolean) => {
      if (open) return;
      setActiveId(null);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("drawer");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (activeId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && items[focusIndex]) {
        e.preventDefault();
        openDrawer(items[focusIndex].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, focusIndex, items, openDrawer]);

  const statusTabs = [
    { key: "", label: "All" },
    { key: "active", label: "In progress" },
    { key: "sold", label: "Sold" },
    { key: "cancelled", label: "Cancelled" },
  ].map((t) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawer");
    if (t.key) params.set("filter", t.key);
    else params.delete("filter");
    const qs = params.toString();
    return {
      href: qs ? `${pathname}?${qs}` : pathname,
      label: t.label,
      active: filter === t.key,
    };
  });

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 bg-[#F7F9FC]/90 px-1 py-2 backdrop-blur-md">
        <MotionTabs tabs={statusTabs} layoutId="bookings-status-pill" />
        <p className="text-[12px] font-medium text-muted-foreground">
          <span className="tabular-nums font-semibold text-foreground">{resultCount}</span>{" "}
          results
        </p>
      </div>

      <AnimeStagger>
        <div className="hidden overflow-hidden rounded-2xl bg-card md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Plot / Project</th>
                <th>Date</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b, idx) => (
                <tr
                  key={b.id}
                  data-anime-item
                  tabIndex={0}
                  style={{ opacity: 0 }}
                  onClick={() => openDrawer(b.id)}
                  onFocus={() => setFocusIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openDrawer(b.id);
                  }}
                  className={cn(
                    "h-9 cursor-pointer outline-none transition",
                    focusIndex === idx && "bg-[#E7EFF6]",
                    activeId === b.id && "bg-[#E7EFF6]",
                  )}
                >
                  <td>
                    <div className="flex min-w-[160px] items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {initials(b.customerName) || "?"}
                      </span>
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {b.bookingNumber}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={cn("status-pill", BOOKING_STATUS_STYLES[b.bookingStatus])}>
                      {BOOKING_STATUS_LABELS[b.bookingStatus]}
                    </span>
                  </td>
                  <td>
                    <p className="text-[13px] font-medium text-foreground">{b.customerName}</p>
                    <p className="text-[11px] text-muted-foreground">{b.customerMobile}</p>
                  </td>
                  <td className="text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">{b.plotNumber}</span>
                    <span className="text-muted-foreground"> · </span>
                    {b.projectName}
                  </td>
                  <td className="whitespace-nowrap text-[13px] text-muted-foreground">
                    {b.bookingDateLabel}
                  </td>
                  <td className="text-right">
                    <p className="tabular-nums text-[13px] font-bold text-foreground">
                      {formatINR(b.finalAmount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Token {formatINR(b.bookingAmount)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-0 md:hidden">
          {items.map((b, idx) => (
            <li key={b.id} data-anime-item style={{ opacity: 0 }}>
              <button
                type="button"
                onClick={() => openDrawer(b.id)}
                onFocus={() => setFocusIndex(idx)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    focusIndex === idx && "bg-[#E7EFF6]",
                  )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {initials(b.customerName) || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {b.bookingNumber}
                    </p>
                    <span
                      className={cn("status-pill shrink-0", BOOKING_STATUS_STYLES[b.bookingStatus])}
                    >
                      {BOOKING_STATUS_LABELS[b.bookingStatus]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {b.customerName} · {b.plotNumber} · {b.projectName}
                  </p>
                  <p className="mt-1 tabular-nums text-sm font-bold text-foreground">
                    {formatINR(b.finalAmount)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </AnimeStagger>

      <BookingDrawer bookingId={activeId} open={Boolean(activeId)} onOpenChange={closeDrawer} />
    </div>
  );
}
