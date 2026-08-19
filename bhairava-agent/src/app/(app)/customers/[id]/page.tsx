import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Phone } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { SectionHeader } from "@/components/mobile/section-header";
import { BookingRow } from "@/components/mobile/booking-row";
import { EmptyState } from "@/components/mobile/empty-state";

async function canView(agentId: string, userId: string, customerId: string, orgId: string) {
  const via = await prisma.booking.findFirst({
    where: { agentId, customerId, deletedAt: null },
    select: { id: true },
  });
  if (via) return true;
  const created = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId, createdBy: userId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(created);
}

export default async function AgentCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  if (!(await canView(session.agentId, session.sub, id, session.orgId))) notFound();

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      bookings: {
        where: { deletedAt: null },
        include: {
          project: { select: { name: true } },
          plot: { select: { plotNumber: true } },
          payments: { where: { deletedAt: null }, select: { amount: true } },
        },
        orderBy: { bookingDate: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const totalAmount = customer.bookings.reduce((s, b) => s + Number(b.finalAmount), 0);
  const totalPaid = customer.bookings.reduce(
    (s, b) => s + b.payments.reduce((ps, p) => ps + Number(p.amount), 0),
    0,
  );
  const pending = Math.max(0, totalAmount - totalPaid);
  const phoneDigits = customer.mobile.replace(/\D/g, "").slice(-10);
  const wa = `https://wa.me/91${phoneDigits}`;
  const initials = customer.fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <MobileHeader title="Customer Details" backHref="/customers" showOverflow />

      <div className="m-card mb-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">{customer.fullName}</p>
            <p className="text-[12px] text-muted-foreground">{customer.mobile}</p>
            {customer.email ? (
              <p className="truncate text-[12px] text-muted-foreground">{customer.email}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a
              href={`tel:${customer.mobile}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-white"
              aria-label="Call"
            >
              <Phone size={15} />
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-[11px] font-bold text-white"
              aria-label="WhatsApp"
            >
              WA
            </a>
          </div>
        </div>
      </div>

      <div className="m-card divide-y divide-[var(--border)] px-3.5 text-[13px]">
        {[
          { label: "Address", value: customer.address || "—" },
          { label: "Customer Type", value: "Individual" },
          { label: "Total Bookings", value: String(customer.bookings.length) },
          { label: "Total Amount", value: formatINR(totalAmount) },
          { label: "Total Paid", value: formatINR(totalPaid) },
          { label: "Pending Amount", value: formatINR(pending) },
        ].map((r) => (
          <div key={r.label} className="flex justify-between gap-3 py-2.5">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="max-w-[55%] text-right font-semibold">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <SectionHeader title="Bookings" href="/bookings" />
      </div>

      {customer.bookings.length === 0 ? (
        <EmptyState message="No bookings" />
      ) : (
        <div className="m-card px-3">
          {customer.bookings.slice(0, 5).map((b) => (
            <BookingRow
              key={b.id}
              href={`/plots/${b.plotId}`}
              plotNumber={b.plot.plotNumber}
              projectName={b.project.name}
              customerName={customer.fullName}
              amount={Number(b.finalAmount)}
              status={b.bookingStatus}
              date={b.bookingDate}
            />
          ))}
        </div>
      )}

      <Link
        href={`/documents?tab=plot&customerId=${customer.id}`}
        className="m-btn m-btn-outline mt-4"
      >
        View Documents
      </Link>
    </div>
  );
}
