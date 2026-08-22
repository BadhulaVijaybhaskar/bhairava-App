import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { SectionHeader } from "@/components/mobile/section-header";
import { BookingRow } from "@/components/mobile/booking-row";
import { EmptyState } from "@/components/mobile/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardMotion } from "./dashboard-motion";

export default async function AgentDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const projectIds = (
    await prisma.agentProjectAssignment.findMany({
      where: { agentId: session.agentId },
      select: { projectId: true },
    })
  ).map((p) => p.projectId);

  const [bookingCount, recentBookings, monthBookings, availablePlots, pendingDocs] =
    await Promise.all([
      prisma.booking.count({
        where: { agentId: session.agentId, deletedAt: null },
      }),
      prisma.booking.findMany({
        where: { agentId: session.agentId, deletedAt: null },
        include: {
          customer: { select: { fullName: true } },
          plot: { select: { plotNumber: true } },
          project: { select: { name: true } },
        },
        orderBy: { bookingDate: "desc" },
        take: 6,
      }),
      prisma.booking.findMany({
        where: {
          agentId: session.agentId,
          deletedAt: null,
          bookingDate: { gte: monthStart },
          bookingStatus: { not: "CANCELLED" },
        },
        select: { finalAmount: true },
      }),
      prisma.plot.count({
        where: {
          organizationId: session.orgId,
          deletedAt: null,
          status: "AVAILABLE",
          projectId: { in: projectIds.length ? projectIds : ["__none__"] },
        },
      }),
      prisma.booking.count({
        where: {
          agentId: session.agentId,
          deletedAt: null,
          bookingStatus: { in: ["PENDING_DOCS", "UNDER_DOCUMENTATION"] },
        },
      }),
    ]);

  const salesMonth = monthBookings.reduce((s, b) => s + Number(b.finalAmount), 0);

  const kpis = [
    { label: "My Bookings", value: String(bookingCount), color: "#0b7a3e", bg: "#e8f7ee", href: "/bookings" },
    {
      label: "Sales This Month",
      value: formatINR(salesMonth),
      color: "#0b7a3e",
      bg: "#e8f7ee",
      href: "/bookings",
    },
    {
      label: "Available Plots",
      value: String(availablePlots),
      color: "#2563eb",
      bg: "#dbeafe",
      href: "/projects",
    },
    {
      label: "Pending Docs",
      value: String(pendingDocs),
      color: "#dc2626",
      bg: "#fee2e2",
      href: "/documents",
    },
  ];

  return (
    <div>
      <MobileHeader title="Agent Dashboard" showMenu showBell />

      <DashboardMotion>
        <div className="mb-3">
          <h2 className="text-[20px] font-bold tracking-tight text-foreground">
            Hello, {session.name}
          </h2>
          <p className="text-[13px] text-muted-foreground">Have a great day!</p>
        </div>

        <div className="kpi-grid">
          {kpis.map((t) => (
            <Link key={t.label} href={t.href} className="block">
              <Card
                className="border-0 shadow-none transition-transform active:scale-[0.98]"
                style={{ background: t.bg }}
              >
                <CardContent className="p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground">{t.label}</p>
                  <p className="mt-1 text-[15px] font-bold leading-tight" style={{ color: t.color }}>
                    {t.value}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-5">
          <SectionHeader title="My Recent Bookings" href="/bookings" />
        </div>

        {recentBookings.length === 0 ? (
          <EmptyState message="No bookings found" />
        ) : (
          <Card className="shadow-sm">
            <CardContent className="px-3 py-0">
              {recentBookings.map((b) => (
                <BookingRow
                  key={b.id}
                  href={`/customers/${b.customerId}`}
                  plotNumber={b.plot.plotNumber}
                  projectName={b.project.name}
                  customerName={b.customer.fullName}
                  amount={Number(b.finalAmount)}
                  status={b.bookingStatus}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </DashboardMotion>
    </div>
  );
}
