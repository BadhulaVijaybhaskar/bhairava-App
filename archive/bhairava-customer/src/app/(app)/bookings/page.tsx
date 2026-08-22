import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatINR } from "@/lib/utils";

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.customerId) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">My bookings</h1>
        <p className="mt-4 text-sm text-muted">No CRM customer linked to this login.</p>
      </div>
    );
  }

  const bookings = await prisma.booking.findMany({
    where: { customerId: session.customerId, deletedAt: null },
    include: {
      project: { select: { name: true } },
      plot: { select: { plotNumber: true } },
    },
    orderBy: { bookingDate: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">My bookings</h1>
      <p className="mt-1 text-sm text-muted">Your plot bookings only.</p>
      <div className="surface mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Booking #</th>
              <th className="px-4 py-3 font-medium">Project / Plot</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No bookings yet.
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id} className="hover:bg-canvas/80">
                  <td className="px-4 py-3 font-medium">{b.bookingNumber}</td>
                  <td className="px-4 py-3 text-muted">
                    {b.project.name} · {b.plot.plotNumber}
                  </td>
                  <td className="px-4 py-3">{formatINR(b.finalAmount)}</td>
                  <td className="px-4 py-3">{b.bookingStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
