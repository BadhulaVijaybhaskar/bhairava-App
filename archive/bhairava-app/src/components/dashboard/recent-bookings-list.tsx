"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { AnimeStagger } from "@/components/motion/anime-stagger";

export type RecentBookingRow = {
  id: string;
  plotNumber: string;
  projectName: string;
  customerName: string;
  bookingDateLabel: string;
  amount: number;
  status: string;
};

export function RecentBookingsList({ items }: { items: RecentBookingRow[] }) {
  const router = useRouter();

  return (
    <AnimeStagger className="mt-3 space-y-0">
      {items.map((b) => (
        <div key={b.id} data-anime-item style={{ opacity: 0 }}>
          <button
            type="button"
            onClick={() => router.push(`/admin/bookings?drawer=${b.id}`)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left transition",
              "hover:bg-[#EFF4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {b.plotNumber}
                <span className="font-medium text-muted-foreground"> · {b.projectName}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {b.customerName} · {b.bookingDateLabel}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular-nums text-[13px] font-bold text-foreground">
                {formatINR(b.amount)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                {b.status.replaceAll("_", " ")}
              </p>
            </div>
          </button>
        </div>
      ))}
      <div className="pt-2">
        <Link href="/admin/bookings" className="text-[13px] font-semibold text-primary">
          Open all bookings →
        </Link>
      </div>
    </AnimeStagger>
  );
}
