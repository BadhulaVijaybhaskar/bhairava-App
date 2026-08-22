"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, FilterBar, PageHeader } from "@/components/kit";
import { bookings, byId, customers, formatINR, payments } from "@/lib/mock-data";

const statusViews = ["All", "Succeeded", "Pending", "Failed", "Refunded"];

export default function PaymentsIndex() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return payments
      .map((p) => ({
        ...p,
        customerName: byId(customers, p.customerId)?.name ?? "—",
        booking: byId(bookings, p.bookingId),
      }))
      .filter((p) => {
        if (active !== "All" && p.status !== active) return false;
        if (
          query &&
          !`${p.id} ${p.reference} ${p.customerName} ${p.bookingId}`.toLowerCase().includes(query.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [active, query]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        description="Every transaction recorded against a booking, across modes and statuses."
      />

      <FilterBar
        views={statusViews}
        active={active}
        onSelect={setActive}
        query={query}
        onQuery={setQuery}
        placeholder="Search payments, reference, customer…"
        right={<span className="numeric text-xs text-muted-foreground">{rows.length} results</span>}
      />

      <DataTable
        rows={rows}
        linkTo="/payments/$paymentId"
        params={(r) => ({ paymentId: r.id })}
        columns={[
          {
            key: "id",
            header: "Payment",
            cell: (r) => (
              <Link href={`/payments/${r.id}`} className="numeric text-xs font-medium hover:text-primary">
                {r.id}
              </Link>
            ),
          },
          { key: "status", header: "Status", cell: (r) => <Chip>{r.status}</Chip> },
          { key: "customer", header: "Customer", cell: (r) => <span className="text-sm">{r.customerName}</span> },
          { key: "mode", header: "Mode", cell: (r) => <span className="text-xs text-muted-foreground">{r.mode}</span> },
          { key: "reference", header: "Reference", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.reference}</span> },
          {
            key: "booking",
            header: "Booking",
            cell: (r) =>
              r.booking ? (
                <Link href={`/bookings/${r.booking.id}`} className="numeric text-xs text-muted-foreground hover:text-primary">
                  {r.booking.id}
                </Link>
              ) : (
                <span className="numeric text-xs text-muted-foreground">{r.bookingId}</span>
              ),
          },
          { key: "date", header: "Date", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.date}</span> },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            cell: (r) => <span className="numeric text-base font-semibold">{formatINR(r.amount, { compact: true })}</span>,
          },
        ]}
      />
    </AppShell>
  );
}
