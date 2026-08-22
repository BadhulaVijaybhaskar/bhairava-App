import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BOOKABLE_PLOT_STATUSES } from "@/lib/bookings";
import { prisma } from "@/lib/db";
import { BookingCreateForm } from "../booking-create-form";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; projectId?: string; plotId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const [projects, plots, customers, agents] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.plot.findMany({
      where: {
        organizationId: session.orgId,
        deletedAt: null,
        status: { in: BOOKABLE_PLOT_STATUSES },
      },
      orderBy: { plotNumber: "asc" },
      select: {
        id: true,
        projectId: true,
        plotNumber: true,
        totalPrice: true,
        status: true,
      },
    }),
    prisma.customer.findMany({
      where: { organizationId: session.orgId, deletedAt: null },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, mobile: true },
    }),
    prisma.agent.findMany({
      where: { organizationId: session.orgId, deletedAt: null, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, mobile: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/admin/bookings" className="text-sm font-semibold text-primary">
          ← Bookings
        </Link>
        <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">New booking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guided 4-step flow — locks the plot and links customer / agent
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="surface p-6 text-sm text-muted-foreground">
          Add a{" "}
          <Link href="/admin/customers/new" className="font-semibold text-primary">
            customer
          </Link>{" "}
          before creating a booking.
        </div>
      ) : plots.length === 0 ? (
        <div className="surface p-6 text-sm text-muted-foreground">
          No bookable plots right now. Plots must be Available, Reserved, or Resale.
        </div>
      ) : (
        <BookingCreateForm
          projects={projects}
          plots={plots.map((p) => ({
            ...p,
            totalPrice: Number(p.totalPrice),
          }))}
          customers={customers}
          agents={agents}
          error={sp.error}
          defaultProjectId={sp.projectId}
          defaultPlotId={sp.plotId}
        />
      )}
    </div>
  );
}
