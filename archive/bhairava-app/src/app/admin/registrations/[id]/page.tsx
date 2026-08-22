import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { RegistrationStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { FlashToast } from "@/components/ui/flash-toast";
import { updateRegistration } from "../actions";

const STATUS_STYLE: Record<RegistrationStatus, string> = {
  NOT_STARTED: "bg-[var(--surface-low)] text-muted-foreground",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  SCHEDULED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

function toInputDate(d: Date | null | undefined) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function RegistrationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const row = await prisma.registration.findFirst({
    where: { id, organizationId: session.orgId },
    include: {
      customer: { select: { id: true, fullName: true, mobile: true } },
      plot: { select: { id: true, plotNumber: true } },
      project: { select: { id: true, name: true } },
      booking: { select: { id: true, bookingNumber: true } },
    },
  });
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-1 py-1">
        <Link
          href="/admin/registrations"
          className="rounded-lg p-2 text-primary hover:bg-canvas"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{row.customer.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {row.plot.plotNumber} · {row.project.name}
          </p>
        </div>
        <span className={cn("status-pill", STATUS_STYLE[row.status])}>
          {STATUS_LABEL[row.status]}
        </span>
      </div>

      {sp.saved === "1" ? <FlashToast message="Registration updated." /> : null}
      {sp.error ? <FlashToast variant="error" message="Could not update registration." /> : null}

      <div className="space-y-2.5">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Booking</span>
          <Link href={`/admin/bookings/${row.booking.id}`} className="font-semibold text-primary">
            {row.booking.bookingNumber}
          </Link>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Customer</span>
          <Link href={`/admin/customers/${row.customer.id}`} className="font-semibold text-primary">
            {row.customer.fullName}
          </Link>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Mobile</span>
          <span className="font-semibold text-foreground">{row.customer.mobile}</span>
        </div>
      </div>

      <form action={updateRegistration} className="surface space-y-3 p-4 sm:p-5">
        <input type="hidden" name="id" value={row.id} />
        <label className="block text-sm font-semibold text-foreground">
          Status
          <select name="status" className="input-field mt-1 !pl-3" defaultValue={row.status}>
            {(Object.keys(STATUS_LABEL) as RegistrationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-foreground">
          Registration number
          <input
            name="registrationNumber"
            defaultValue={row.registrationNumber ?? ""}
            className="input-field mt-1 !pl-3"
            placeholder="Deed / office number"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-foreground">
            Scheduled date
            <input
              type="date"
              name="scheduledDate"
              defaultValue={toInputDate(row.scheduledDate)}
              className="input-field mt-1 !pl-3"
            />
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Completed date
            <input
              type="date"
              name="completedDate"
              defaultValue={toInputDate(row.completedDate)}
              className="input-field mt-1 !pl-3"
            />
          </label>
        </div>
        <label className="block text-sm font-semibold text-foreground">
          Notes
          <textarea
            name="notes"
            rows={3}
            defaultValue={row.notes ?? ""}
            className="input-field mt-1 !pl-3"
          />
        </label>
        <button type="submit" className="btn-primary px-6 py-2.5">
          Save registration
        </button>
      </form>

      {row.scheduledDate || row.completedDate ? (
        <p className="text-xs text-muted-foreground">
          {row.scheduledDate ? `Scheduled ${formatIndianDate(row.scheduledDate)}` : ""}
          {row.scheduledDate && row.completedDate ? " · " : ""}
          {row.completedDate ? `Completed ${formatIndianDate(row.completedDate)}` : ""}
        </p>
      ) : null}
    </div>
  );
}
