"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand";
import { Btn } from "@/components/kit";
import { bookings, byId, customers, formatINR, payments, plots, projects } from "@/lib/mock-data";

const digits = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function amountInWords(n: number) {
  const lakh = Math.floor(n / 100000);
  const rest = n % 100000;
  if (lakh > 0) return `Rupees ${lakh.toLocaleString("en-IN")} Lakh ${rest > 0 ? (rest / 1000).toFixed(0) + " Thousand " : ""}Only`;
  const thousand = Math.floor(n / 1000);
  return `Rupees ${thousand.toLocaleString("en-IN")} Thousand Only`;
}

export default function ReceiptPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const payment = byId(payments, paymentId);

  if (!payment) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-center">
          <p className="font-display text-xl font-semibold">Receipt not found</p>
          <p className="text-sm text-muted-foreground">No payment with id “{paymentId}” exists.</p>
          <Link href="/payments" className="pt-2 text-sm font-medium text-primary">
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
  void digits;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pt-8 pb-24">
        <div className="bg-surface-lowest rounded-2xl p-12 shadow-ambient">
          <div className="flex items-start justify-between pb-10">
            <div className="flex items-center gap-3">
              <BrandLogo size={48} />
              <div>
                <p className="font-display text-lg font-semibold">Bhairava Land Ventures</p>
                <p className="text-xs text-muted-foreground">Hyderabad, Telangana · RERA registered</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Receipt No</p>
              <p className="numeric text-sm font-medium">{payment.id}</p>
              <p className="numeric pt-1 text-xs text-muted-foreground">{payment.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 border-t border-transparent bg-surface-c/40 rounded-xl p-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Received from</p>
              <p className="pt-1.5 text-sm font-medium">{customer?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{customer?.phone}</p>
              <p className="text-xs text-muted-foreground">{customer?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Plot / Project</p>
              <p className="pt-1.5 text-sm font-medium">{plot?.number ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{project?.name}</p>
              <p className="numeric text-xs text-muted-foreground">Booking {booking?.id}</p>
            </div>
          </div>

          <div className="pt-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="pb-3 text-left">Description</th>
                  <th className="pb-3 text-left">Mode</th>
                  <th className="pb-3 text-left">Reference</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-surface-c/40">
                  <td className="rounded-l-lg px-3 py-4">Instalment towards {project?.name ?? "booking"}</td>
                  <td className="px-3 py-4">{payment.mode}</td>
                  <td className="numeric px-3 py-4 text-xs">{payment.reference}</td>
                  <td className="numeric rounded-r-lg px-3 py-4 text-right font-medium">
                    {formatINR(payment.amount, { compact: true })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Amount in words</p>
              <p className="pt-1 text-sm italic text-muted-foreground">{amountInWords(payment.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Total received</p>
              <p className="numeric pt-1 text-2xl font-semibold">{formatINR(payment.amount, { compact: true })}</p>
            </div>
          </div>

          <div className="flex items-end justify-between pt-16">
            <div>
              <p className="text-xs text-muted-foreground">Payment mode</p>
              <p className="text-sm font-medium">{payment.mode}</p>
            </div>
            <div className="text-center">
              <div className="ghost-line mb-2 h-px w-40" />
              <p className="text-xs text-muted-foreground">Authorised signatory</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 shadow-ambient">
        <Link href={`/payments/${payment.id}`} className="inline-flex">
          <Btn variant="ghost">
            <ArrowLeft className="h-4 w-4" /> Back to payment
          </Btn>
        </Link>
        <Btn variant="tonal">
          <Printer className="h-4 w-4" /> Print
        </Btn>
        <Btn variant="primary">
          <Download className="h-4 w-4" /> Download PDF
        </Btn>
      </div>
    </AppShell>
  );
}
