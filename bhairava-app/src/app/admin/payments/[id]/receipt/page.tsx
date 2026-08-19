import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { PrintButton } from "@/components/ui/print-button";

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      receipt: true,
      booking: {
        include: {
          project: { select: { name: true, code: true } },
          plot: { select: { plotNumber: true } },
          customer: { select: { fullName: true, mobile: true } },
        },
      },
      organization: { select: { name: true, phone: true, email: true } },
    },
  });

  if (!payment) notFound();

  const receiptNo =
    payment.receiptNumber || payment.receipt?.receiptNumber || payment.id.slice(0, 8);

  return (
    <div className="mx-auto max-w-2xl space-y-4 print:max-w-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/admin/bookings/${payment.bookingId}`} className="text-sm font-semibold text-primary">
          ← Booking
        </Link>
        <Link href="/admin/payments" className="text-sm text-muted-foreground hover:text-primary">
          Payments
        </Link>
      </div>

      <div className="surface p-6 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="font-display text-xl font-bold text-primary">Bhairava Real Estate</p>
            <p className="text-xs text-muted-foreground">{payment.organization.name}</p>
            {payment.organization.phone ? (
              <p className="text-xs text-muted-foreground">{payment.organization.phone}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Receipt</p>
            <p className="font-semibold text-foreground">{receiptNo}</p>
            <p className="text-xs text-muted-foreground">{formatIndianDate(payment.paymentDate)}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Received from</dt>
            <dd className="font-semibold text-foreground">{payment.booking.customer.fullName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Mobile</dt>
            <dd className="font-medium text-foreground">{payment.booking.customer.mobile}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Project / Plot</dt>
            <dd className="font-medium text-foreground">
              {payment.booking.project.name} · {payment.booking.plot.plotNumber}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Booking</dt>
            <dd className="font-medium text-foreground">{payment.booking.bookingNumber}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Method</dt>
            <dd className="font-medium text-foreground">{payment.paymentMethod}</dd>
          </div>
          {payment.transactionReference ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium text-foreground">{payment.transactionReference}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base">
            <dt className="font-semibold text-foreground">Amount paid</dt>
            <dd className="font-bold text-primary">{formatINR(Number(payment.amount))}</dd>
          </div>
        </dl>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Computer-generated receipt — Bhairava Real Estate.
        </p>
      </div>

      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
