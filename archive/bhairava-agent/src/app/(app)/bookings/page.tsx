import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { BookingsSearchFilter } from "@/components/mobile/filter-sheet";
import { BookingRow } from "@/components/mobile/booking-row";
import { EmptyState } from "@/components/mobile/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { MotionTabs } from "@/components/motion/motion-tabs";
import { FadeIn } from "@/components/motion/fade-in";

const TABS = [
  { key: "All", label: "All" },
  { key: "RESERVED", label: "Reserved" },
  { key: "AGREEMENT", label: "Agreement" },
  { key: "REGISTERED", label: "Registered" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default async function AgentBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    created?: string;
    q?: string;
    projectId?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const tab = (sp.tab || "All").toUpperCase();
  const q = (sp.q || "").trim();
  const projectId = (sp.projectId || "").trim();

  const [bookings, projects] = await Promise.all([
    prisma.booking.findMany({
      where: {
        agentId: session.agentId,
        deletedAt: null,
        ...(tab !== "ALL" ? { bookingStatus: tab as never } : {}),
        ...(projectId ? { projectId } : {}),
        ...(q
          ? {
              OR: [
                { plot: { plotNumber: { contains: q, mode: "insensitive" } } },
                { customer: { fullName: { contains: q, mode: "insensitive" } } },
                { project: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, fullName: true } },
        plot: { select: { plotNumber: true } },
        project: { select: { name: true } },
      },
      orderBy: { bookingDate: "desc" },
    }),
    prisma.agentProjectAssignment.findMany({
      where: { agentId: session.agentId },
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div>
      <MobileHeader title="Bookings" showMenu showBell />

      <FadeIn>
        <Suspense fallback={<div className="mb-3 h-11 rounded-xl bg-white" />}>
          <BookingsSearchFilter
            defaultQ={q}
            defaultProject={projectId}
            defaultTab={tab}
            projects={projects.map((p) => p.project)}
          />
        </Suspense>

        <MotionTabs
          tabs={TABS}
          active={tab}
          basePath="/bookings"
          preserve={{ q: q || undefined, projectId: projectId || undefined }}
        />

        {sp.created === "1" ? (
          <p className="mb-2 text-[12px] font-medium text-primary">Booking created.</p>
        ) : null}

        {bookings.length === 0 ? (
          <EmptyState
            message="No bookings found"
            action={
              <Link href="/projects" className="m-btn">
                Browse projects
              </Link>
            }
          />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="px-3 py-0">
              {bookings.map((b) => (
                <BookingRow
                  key={b.id}
                  href={`/customers/${b.customer.id}`}
                  plotNumber={b.plot.plotNumber}
                  projectName={b.project.name}
                  customerName={b.customer.fullName}
                  amount={Number(b.finalAmount)}
                  status={b.bookingStatus}
                  date={b.bookingDate}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </FadeIn>
    </div>
  );
}
