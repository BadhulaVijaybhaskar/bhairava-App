"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Wallet } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type BookingDrawerSummary = {
  id: string;
  bookingNumber: string;
  status: string;
  statusLabel: string;
  bookingDate: string;
  finalAmount: number;
  bookingAmount: number;
  discount: number;
  notes: string | null;
  project: { id: string; name: string };
  plot: { id: string; plotNumber: string; status: string };
  customer: { id: string; fullName: string; mobile: string };
  agent: { id: string; fullName: string } | null;
  paid: number;
  scheduled: number;
  progressPct: number;
};

export function BookingDrawer({
  bookingId,
  open,
  onOpenChange,
}: {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<BookingDrawerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !bookingId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/bookings/${bookingId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<BookingDrawerSummary>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load booking.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md data-[side=right]:duration-400"
        style={{ boxShadow: "0 12px 40px rgba(16,42,67,0.07)" }}
      >
        <SheetHeader className="bg-[#EFF4F8] px-5 py-4 text-left">
          <SheetTitle className="text-[15px]">
            {data?.bookingNumber ?? "Booking details"}
          </SheetTitle>
          <SheetDescription>
            {data
              ? `${data.plot.plotNumber} · ${data.project.name}`
              : "Preview without leaving the list"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {data ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={cn(
                    "status-pill bg-[#EDF4F8] text-primary",
                  )}
                >
                  {data.statusLabel}
                </span>
                <p className="tabular-nums text-lg font-bold text-foreground">
                  {formatINR(data.finalAmount)}
                </p>
              </div>

              <div className="rounded-xl bg-[#EFF4F8] p-3.5">
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-muted-foreground">Payment progress</span>
                  <span className="tabular-nums font-bold text-foreground">
                    {data.progressPct}%
                  </span>
                </div>
                <Progress value={data.progressPct} className="h-2" />
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Paid {formatINR(data.paid)}</span>
                  <span>
                    of{" "}
                    {formatINR(data.scheduled > 0 ? data.scheduled : data.finalAmount)}
                  </span>
                </div>
              </div>

              <dl className="space-y-2.5 text-[13px]">
                <Row label="Customer">
                  <Link
                    href={`/admin/customers/${data.customer.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {data.customer.fullName}
                  </Link>
                  <span className="text-muted-foreground"> · {data.customer.mobile}</span>
                </Row>
                <Row label="Plot">
                  <Link
                    href={`/admin/plots/${data.plot.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {data.plot.plotNumber}
                  </Link>
                </Row>
                <Row label="Project">
                  <Link
                    href={`/admin/projects/${data.project.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {data.project.name}
                  </Link>
                </Row>
                <Row label="Agent">{data.agent?.fullName ?? "—"}</Row>
                <Row label="Token">{formatINR(data.bookingAmount)}</Row>
                <Row label="Discount">{formatINR(data.discount)}</Row>
              </dl>

              {data.notes ? (
                <>
                  <Separator />
                  <p className="text-[12px] text-muted-foreground">{data.notes}</p>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        {data ? (
          <div className="mt-auto flex gap-2 bg-[#EFF4F8] p-4">
            <Link
              href={`/admin/bookings/${data.id}`}
              className={cn(
                "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#E7EFF6] text-sm font-medium hover:bg-[#DDE8F2]",
              )}
            >
              <ExternalLink className="size-3.5" />
              Full page
            </Link>
            <Link
              href={`/admin/bookings/${data.id}#payments`}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Wallet className="size-3.5" />
              Record payment
            </Link>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{children}</dd>
    </div>
  );
}
