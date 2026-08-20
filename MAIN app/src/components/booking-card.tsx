import { Link } from "@tanstack/react-router";
import { Chip } from "@/components/kit";
import { agents, byId, customers, formatINR, plots, projects, type Booking } from "@/lib/mock-data";

/** Reusable payment progress row: ₹Paid / ₹Total on the left, % on the right, one bar underneath. */
export function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = Math.min(100, Math.round((paid / (total || 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="numeric text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{formatINR(paid, { compact: true })}</span>
          {" / "}
          {formatINR(total, { compact: true })}
        </span>
        <span className="numeric text-xs font-medium text-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-c">
        <div className="gradient-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Compact, high-density mobile booking card.
 * Top row: booking id + stage pill · customer name · Project + Plot · Agent + Date · one payment-progress row.
 */
export function BookingCard({ booking }: { booking: Booking }) {
  const customer = byId(customers, booking.customerId);
  const plot = byId(plots, booking.plotId);
  const project = byId(projects, booking.projectId);
  const agent = byId(agents, booking.agentId);

  return (
    <Link
      to="/bookings/$bookingId"
      params={{ bookingId: booking.id }}
      className="panel block p-3.5 transition-transform duration-200 active:scale-[0.995]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="numeric text-xs font-semibold">{booking.id}</span>
        <Chip>{booking.stage}</Chip>
      </div>

      <p className="mt-1 truncate text-sm font-medium">{customer?.name ?? "—"}</p>

      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{project?.name ?? "—"}</span>
        <span aria-hidden className="text-muted-foreground/60">·</span>
        <span className="numeric shrink-0">{plot?.number ?? "—"}</span>
      </div>

      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{agent?.name ?? "—"}</span>
        <span aria-hidden className="text-muted-foreground/60">·</span>
        <span className="numeric shrink-0">{booking.date}</span>
      </div>

      <div className="mt-2.5">
        <PaymentProgress paid={booking.paid} total={booking.amount} />
      </div>
    </Link>
  );
}
