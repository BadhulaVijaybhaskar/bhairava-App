import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, FilterBar, PageHeader } from "@/components/kit";
import { byId, formatINR } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/payments/")({
  head: () => ({
    meta: [
      { title: "Payments — Bhairava" },
      {
        name: "description",
        content: "All incoming payments across bookings, with status, mode and reference.",
      },
      { property: "og:title", content: "Payments — Bhairava" },
      {
        property: "og:description",
        content: "All incoming payments across bookings, with status, mode and reference.",
      },
    ],
  }),
  component: PaymentsIndex,
});

const statusViews = ["All", "Succeeded", "Pending", "Failed", "Refunded"];

function PaymentsIndex() {
  const { payments, customers, bookings } = useData();
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
          !`${p.id} ${p.reference} ${p.customerName} ${p.bookingId}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [active, query, payments, customers, bookings]);

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
        onFilters={() => toast.message("Use the status tabs to filter payments.")}
        onExport={() => {
          downloadCsv(
            `bhairava-payments-${new Date().toISOString().slice(0, 10)}.csv`,
            ["ID", "Status", "Customer", "Mode", "Reference", "Booking", "Date", "Amount"],
            rows.map((r) => [
              r.id,
              r.status,
              r.customerName,
              r.mode,
              r.reference,
              r.bookingId,
              r.date,
              String(r.amount),
            ]),
          );
          toast.success(`Exported ${rows.length} payments`);
        }}
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
              <Link
                to="/payments/$paymentId"
                params={{ paymentId: r.id }}
                className="numeric text-xs font-medium hover:text-primary"
              >
                {r.id}
              </Link>
            ),
          },
          { key: "status", header: "Status", cell: (r) => <Chip>{r.status}</Chip> },
          {
            key: "customer",
            header: "Customer",
            cell: (r) => <span className="text-sm">{r.customerName}</span>,
          },
          {
            key: "mode",
            header: "Mode",
            cell: (r) => <span className="text-xs text-muted-foreground">{r.mode}</span>,
          },
          {
            key: "reference",
            header: "Reference",
            cell: (r) => (
              <span className="numeric text-xs text-muted-foreground">{r.reference}</span>
            ),
          },
          {
            key: "booking",
            header: "Booking",
            cell: (r) =>
              r.booking ? (
                <Link
                  to="/bookings/$bookingId"
                  params={{ bookingId: r.booking.id }}
                  className="numeric text-xs text-muted-foreground hover:text-primary"
                >
                  {r.booking.id}
                </Link>
              ) : (
                <span className="numeric text-xs text-muted-foreground">{r.bookingId}</span>
              ),
          },
          {
            key: "date",
            header: "Date",
            cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.date}</span>,
          },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            cell: (r) => (
              <span className="numeric text-base font-semibold">
                {formatINR(r.amount, { compact: true })}
              </span>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
