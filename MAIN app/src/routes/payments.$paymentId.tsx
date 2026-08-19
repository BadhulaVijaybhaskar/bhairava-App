import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Btn, Chip, Panel, SectionTitle, Timeline } from "@/components/kit";
import { bookings, byId, customers, formatINR, payments, plots, projects } from "@/lib/mock-data";

export const Route = createFileRoute("/payments/$paymentId")({
  head: ({ params }) => ({
    meta: [
      { title: `Payment ${params.paymentId} — Bhairava` },
      { name: "description", content: "Payment detail, method, timeline and receipt." },
      { property: "og:title", content: `Payment ${params.paymentId} — Bhairava` },
      { property: "og:description", content: "Payment detail, method, timeline and receipt." },
    ],
  }),
  component: PaymentDetail,
});

function PaymentDetail() {
  const { paymentId } = Route.useParams();
  const payment = byId(payments, paymentId);

  if (!payment) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
          <p className="font-display text-xl font-semibold">Payment not found</p>
          <p className="text-sm text-muted-foreground">No payment with id “{paymentId}” exists.</p>
          <Link to="/payments" className="pt-2 text-sm font-medium text-primary">
            Back to payments
          </Link>
        </div>
      </AppShell>
    );
  }

  const customer = byId(customers, payment.customerId);
  const booking = byId(bookings, payment.bookingId);
  const plot = booking ? byId(plots, booking.plotId) : undefined;
  const project = booking ? byId(projects, booking.projectId) : undefined;

  const feePct = payment.status === "Succeeded" ? 0.012 : 0;
  const fee = Math.round(payment.amount * feePct);
  const net = payment.amount - fee;

  const timeline = [
    { time: payment.date, title: "Payment succeeded", detail: `Settled via ${payment.mode}` },
    { time: payment.date, title: "Payment processed", detail: `Reference ${payment.reference}` },
    { time: payment.date, title: "Payment created", detail: `Linked to booking ${payment.bookingId}` },
  ];

  return (
    <AppShell>
      <div className="pt-8 pb-2">
        <Link to="/payments" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Payments
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <p className="pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Payment · {payment.id}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="numeric font-display text-5xl font-semibold tracking-tight">
              {formatINR(payment.amount, { compact: true })}
            </h1>
            <Chip>{payment.status}</Chip>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="tonal">
            <RotateCcw className="h-4 w-4" /> Refund
          </Btn>
          <Btn variant="primary">
            <Send className="h-4 w-4" /> Resend receipt
          </Btn>
        </div>
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel>
            <SectionTitle>Payment method</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <Field label="Mode" value={payment.mode} />
              <Field label="Reference" value={<span className="numeric">{payment.reference}</span>} />
              <Field label="Date" value={<span className="numeric">{payment.date}</span>} />
              <Field
                label="Customer"
                value={
                  customer ? (
                    <Link to="/customers/$customerId" params={{ customerId: customer.id }} className="hover:text-primary">
                      {customer.name}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Booking"
                value={
                  booking ? (
                    <Link to="/bookings/$bookingId" params={{ bookingId: booking.id }} className="numeric hover:text-primary">
                      {booking.id}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Plot / Project"
                value={plot && project ? `${plot.number} · ${project.name}` : "—"}
              />
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Breakdown</SectionTitle>
            <div className="space-y-3">
              <Row label="Gross amount" value={formatINR(payment.amount, { compact: true })} />
              <Row label="Processing fee" value={`-${formatINR(fee, { compact: true })}`} muted />
              <Row label="Net settled" value={formatINR(net, { compact: true })} strong />
            </div>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <SectionTitle>Timeline</SectionTitle>
            <Timeline items={timeline} />
          </Panel>

          <Panel tonal>
            <SectionTitle>Receipt</SectionTitle>
            <p className="pb-4 text-sm text-muted-foreground">
              A finance-grade receipt document for this transaction.
            </p>
            <Link
              to="/receipts/$paymentId"
              params={{ paymentId: payment.id }}
              className="gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              View receipt
            </Link>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <div className="pt-1.5 text-sm font-medium">{value}</div>
    </div>
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
