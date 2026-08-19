import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Banknote, Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  ListSearchBar,
  ListSearchBarFallback,
  type ListFilterOption,
} from "@/components/ui";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PARTIAL: "bg-sky-100 text-sky-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  WAIVED: "bg-[var(--surface-low)] text-muted-foreground",
  CANCELLED: "bg-[var(--surface-low)] text-muted-foreground",
};

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All statuses" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Due" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filterRaw = (sp.filter || "").toLowerCase();
  const filter = filterRaw === "paid" || filterRaw === "pending" ? filterRaw : "";
  const q = (sp.q || "").trim();

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      ...(filter === "paid"
        ? { status: "PAID" }
        : filter === "pending"
          ? { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } }
          : {}),
      ...(q
        ? {
            OR: [
              { receiptNumber: { contains: q, mode: "insensitive" } },
              { transactionReference: { contains: q, mode: "insensitive" } },
              { booking: { bookingNumber: { contains: q, mode: "insensitive" } } },
              { booking: { customer: { fullName: { contains: q, mode: "insensitive" } } } },
              { booking: { plot: { plotNumber: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    orderBy: { paymentDate: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          customer: { select: { id: true, fullName: true } },
          plot: { select: { plotNumber: true } },
          project: { select: { name: true } },
        },
      },
      schedule: {
        select: { installmentNumber: true, dueDate: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex justify-end">
        <Link href="/admin/bookings" className="btn-primary px-3.5 py-2">
          <Plus className="h-4 w-4" />
          From booking
        </Link>
      </div>

      <Suspense fallback={<ListSearchBarFallback />}>
        <ListSearchBar
          basePath="/admin/payments"
          placeholder="Search payments"
          initialQ={q}
          initialFilter={filter}
          filters={FILTERS}
        />
      </Suspense>

      {payments.length === 0 ? (
        <EmptyState
          icon={<Banknote className="h-7 w-7" />}
          title={q || filter ? "No matches" : "No payments yet"}
          description={
            q || filter
              ? "Try a different search or filter."
              : "Payments appear here after bookings collect token or installment amounts."
          }
          action={
            !q && !filter ? (
              <Link href="/admin/bookings" className="btn-primary px-3.5 py-2">
                Open bookings
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
                  <th>Payment</th>
                  <th>Customer / plot</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/admin/bookings/${p.booking.id}`}
                        className="flex min-w-[180px] items-center gap-2.5 hover:text-primary"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {initials(p.booking.customer.fullName) || "?"}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                          <span className="truncate font-semibold text-foreground">
                            {p.receiptNumber || p.booking.bookingNumber}
                          </span>
                          <span
                            className={cn(
                              "status-pill shrink-0",
                              STATUS_STYLE[p.status] ?? "bg-[var(--surface-low)]",
                            )}
                          >
                            {p.status}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <p className="text-sm font-medium text-foreground">
                        {p.booking.customer.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.booking.plot.plotNumber} · {p.booking.project.name}
                      </p>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {p.paymentMethod}
                      {p.schedule ? (
                        <span className="block text-xs">Inst. #{p.schedule.installmentNumber}</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatIndianDate(p.paymentDate)}
                    </td>
                    <td className="text-right font-bold text-foreground">
                      {formatINR(Number(p.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-0 md:hidden">
            {payments.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/bookings/${p.booking.id}`}
                  className="flex items-start gap-3 px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {initials(p.booking.customer.fullName) || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.booking.customer.fullName}
                      </p>
                      <span
                        className={cn(
                          "status-pill shrink-0",
                          STATUS_STYLE[p.status] ?? "bg-[var(--surface-low)]",
                        )}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {p.booking.plot.plotNumber} · {formatIndianDate(p.paymentDate)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-foreground">
                      {formatINR(Number(p.amount))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
