import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, Panel, SectionTitle, Timeline } from "@/components/kit";
import { agents, bookings, byId, customers, documents, formatINR, payments, plots, projects } from "@/lib/mock-data";

export const Route = createFileRoute("/bookings/$bookingId")({
  head: ({ params }) => ({
    meta: [
      { title: `Booking ${params.bookingId} — Bhairava` },
      { name: "description", content: "Booking financials, linked records, payment schedule and documents." },
      { property: "og:title", content: `Booking ${params.bookingId} — Bhairava` },
      { property: "og:description", content: "Booking financials, linked records, payment schedule and documents." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const booking = byId(bookings, bookingId);

  if (!booking) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
          <p className="font-display text-xl font-semibold">Booking not found</p>
          <p className="text-sm text-muted-foreground">No booking with id “{bookingId}” exists.</p>
          <Link to="/bookings" className="pt-2 text-sm font-medium text-primary">
            Back to bookings
          </Link>
        </div>
      </AppShell>
    );
  }

  const customer = byId(customers, booking.customerId);
  const plot = byId(plots, booking.plotId);
  const project = byId(projects, booking.projectId);
  const agent = byId(agents, booking.agentId);
  const bookingPayments = payments.filter((p) => p.bookingId === booking.id).sort((a, b) => (a.date < b.date ? -1 : 1));
  const bookingDocs = documents.filter((d) => d.customerId === booking.customerId && d.plotId === booking.plotId);

  const plotValue = booking.amount;
  const discount = Math.round(plotValue * 0.02);
  const taxes = Math.round(plotValue * 0.015);
  const registration = Math.round(plotValue * 0.06);
  const total = plotValue - discount + taxes + registration;
  const balance = total - booking.paid;

  const schedule = Array.from({ length: 4 }, (_, i) => {
    const share = total / 4;
    const paidTillNow = Math.min(booking.paid, share * (i + 1));
    const isPaid = paidTillNow >= share * (i + 1) - 1;
    return {
      id: `${booking.id}-INST-${i + 1}`,
      label: `Instalment ${i + 1}`,
      amount: Math.round(share),
      due: `2026-0${((i * 2) % 8) + 1}-15`,
      state: isPaid ? "Paid" : i === 0 ? "Due" : "Upcoming",
    };
  });

  const timeline = [
    { time: booking.date, title: "Booking registered", detail: booking.stage === "Registered" ? "Sale deed executed" : "" },
    { time: booking.date, title: `Agreement stage: ${booking.stage}` },
    { time: booking.date, title: "Booking created", detail: `By ${agent?.name ?? "agent"}` },
  ];

  return (
    <AppShell>
      <div className="pt-8 pb-2">
        <Link to="/bookings" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Bookings
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <p className="pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Booking · {booking.id}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="numeric font-display text-5xl font-semibold tracking-tight">
              {formatINR(booking.amount, { compact: true })}
            </h1>
            <Chip>{booking.stage}</Chip>
          </div>
        </div>
      </div>

      <div className="grid gap-6 pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel>
            <SectionTitle>Financial breakdown</SectionTitle>
            <div className="space-y-3">
              <Row label="Plot value" value={formatINR(plotValue, { compact: true })} />
              <Row label="Discount" value={`-${formatINR(discount, { compact: true })}`} muted />
              <Row label="Taxes" value={formatINR(taxes, { compact: true })} muted />
              <Row label="Registration charges" value={formatINR(registration, { compact: true })} muted />
              <Row label="Total payable" value={formatINR(total, { compact: true })} strong />
              <Row label="Paid till date" value={formatINR(booking.paid, { compact: true })} />
              <Row label="Balance due" value={formatINR(Math.max(0, balance), { compact: true })} strong />
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:col-span-4">
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Customer</p>
            {customer ? (
              <Link to="/customers/$customerId" params={{ customerId: customer.id }} className="pt-1.5 block text-sm font-medium hover:text-primary">
                {customer.name}
              </Link>
            ) : (
              <p className="pt-1.5 text-sm">—</p>
            )}
          </Panel>
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Plot / Project</p>
            <p className="pt-1.5 text-sm font-medium">{plot?.number ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{project?.name}</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Agent</p>
            <p className="pt-1.5 text-sm font-medium">{agent?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{agent?.region}</p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div>
            <SectionTitle>Payment schedule</SectionTitle>
            <DataTable
              rows={schedule}
              columns={[
                { key: "label", header: "Instalment", cell: (r) => <span className="text-sm">{r.label}</span> },
                { key: "due", header: "Due date", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.due}</span> },
                { key: "state", header: "State", cell: (r) => <Chip>{r.state}</Chip> },
                { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="numeric text-sm font-medium">{formatINR(r.amount, { compact: true })}</span> },
              ]}
            />
          </div>

          <div>
            <SectionTitle>Payments received</SectionTitle>
            <DataTable
              rows={bookingPayments}
              linkTo="/payments/$paymentId"
              params={(r) => ({ paymentId: r.id })}
              columns={[
                { key: "id", header: "Payment", cell: (r) => <span className="numeric text-xs">{r.id}</span> },
                { key: "mode", header: "Mode", cell: (r) => <span className="text-xs text-muted-foreground">{r.mode}</span> },
                { key: "status", header: "Status", cell: (r) => <Chip>{r.status}</Chip> },
                { key: "date", header: "Date", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.date}</span> },
                { key: "amount", header: "Amount", align: "right", cell: (r) => <span className="numeric text-sm font-medium">{formatINR(r.amount, { compact: true })}</span> },
              ]}
            />
          </div>

          <div>
            <SectionTitle>Documents</SectionTitle>
            <Panel className="divide-y divide-transparent p-0">
              {bookingDocs.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No documents on file.</p>}
              {bookingDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.type}</p>
                  </div>
                  <Chip>{d.verified}</Chip>
                </div>
              ))}
            </Panel>
          </div>
        </div>

        <div className="lg:col-span-4">
          <SectionTitle>Audit timeline</SectionTitle>
          <Panel>
            <Timeline items={timeline} />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`numeric text-sm ${strong ? "text-lg font-semibold" : muted ? "text-muted-foreground" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}
