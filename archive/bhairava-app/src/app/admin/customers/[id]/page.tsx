import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings";
import {
  FUNNEL_PILL,
  parseDocChecklist,
  resolveFunnelStage,
} from "@/lib/customer-funnel";
import { formatIndianDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { FlashToast } from "@/components/ui/flash-toast";
import { FollowUpSchedulePopup } from "@/components/customers/follow-up-schedule";
import { CustomerDocumentsSection } from "@/components/customers/customer-documents-section";
import {
  CustomerContactLines,
  CustomerDetailBlock,
  type DetailRow,
  type StatusItem,
} from "@/components/customers/customer-profile-interactive";

const BOUGHT_PLOT = new Set(["SOLD", "REGISTERED"]);
const BOUGHT_BOOKING = new Set(["SOLD", "REGISTERED"]);
const ACTIVE_BOOKING = new Set([
  "RESERVED",
  "BOOKED",
  "AGREEMENT",
  "PENDING_DOCS",
  "UNDER_DOCUMENTATION",
]);
const ACTIVE_INTEREST = new Set(["INTERESTED", "CALLBACK_REQUEST", "WAITLIST", "OFFER"]);

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; followSaved?: string; followError?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const customer = await prisma.customer.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null },
    include: {
      plots: {
        where: { deletedAt: null },
        take: 20,
        orderBy: { updatedAt: "desc" },
        include: { project: { select: { id: true, name: true } } },
      },
      bookings: {
        where: { deletedAt: null },
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          plot: { select: { id: true, plotNumber: true } },
          project: { select: { id: true, name: true } },
          schedules: {
            where: { status: { in: ["PENDING", "PARTIAL"] } },
            select: { dueDate: true, installmentNumber: true, amountDue: true },
            take: 10,
          },
        },
      },
      documents: {
        where: { deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 30,
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  if (!customer) notFound();

  const savedFollowUps = Array.isArray(customer.followUps)
    ? (customer.followUps as Array<{ id?: string; at?: string; note?: string }>).filter(
        (f) => f && typeof f.at === "string" && typeof f.id === "string",
      )
    : [];

  const interests = await prisma.plotInterest.findMany({
    where: {
      organizationId: session.orgId,
      customerId: customer.id,
      type: { in: ["INTERESTED", "CALLBACK_REQUEST", "WAITLIST", "OFFER"] },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      plot: {
        select: {
          id: true,
          plotNumber: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
  });

  const boughtMap = new Map<
    string,
    {
      key: string;
      plotNumber: string;
      projectName: string;
      href: string;
      statusLabel: string;
      amount?: string;
      bookingDate?: string;
    }
  >();
  for (const p of customer.plots.filter((x) => BOUGHT_PLOT.has(x.status))) {
    boughtMap.set(p.id, {
      key: `plot-${p.id}`,
      plotNumber: p.plotNumber,
      projectName: p.project.name,
      href: `/admin/plots/${p.id}`,
      statusLabel: p.status.replaceAll("_", " "),
      bookingDate: p.bookingDate ? formatIndianDate(p.bookingDate) : undefined,
      amount: formatINR(Number(p.totalPrice)),
    });
  }
  for (const b of customer.bookings.filter((x) => BOUGHT_BOOKING.has(x.bookingStatus))) {
    const existing = boughtMap.get(b.plot.id);
    if (existing) {
      existing.statusLabel = BOOKING_STATUS_LABELS[b.bookingStatus];
      existing.bookingDate = formatIndianDate(b.bookingDate);
      existing.amount = formatINR(Number(b.finalAmount));
      continue;
    }
    boughtMap.set(b.plot.id, {
      key: `book-${b.id}`,
      plotNumber: b.plot.plotNumber,
      projectName: b.project.name,
      href: `/admin/plots/${b.plot.id}`,
      statusLabel: BOOKING_STATUS_LABELS[b.bookingStatus],
      bookingDate: formatIndianDate(b.bookingDate),
      amount: formatINR(Number(b.finalAmount)),
    });
  }
  const boughtPlots = Array.from(boughtMap.values());
  const boughtPlotIds = new Set(boughtMap.keys());
  const boughtLabels = new Set(
    boughtPlots.map((p) => `${p.plotNumber}, ${p.projectName}`),
  );

  const currentInProgress = customer.bookings
    .filter((b) => ACTIVE_BOOKING.has(b.bookingStatus) && !boughtPlotIds.has(b.plot.id))
    .map((b) => ({
      key: b.id,
      label: `${b.plot.plotNumber}, ${b.project.name}`,
      plotId: b.plot.id,
      plotNumber: b.plot.plotNumber,
      projectName: b.project.name,
      href: `/admin/bookings/${b.id}`,
      meta: BOOKING_STATUS_LABELS[b.bookingStatus],
    }));

  const currentInterest = interests
    .filter((i) => ACTIVE_INTEREST.has(i.type) && !boughtPlotIds.has(i.plot.id))
    .filter((i) => !currentInProgress.some((b) => b.plotId === i.plot.id))
    .map((i) => ({
      key: i.id,
      label: `${i.plot.plotNumber}, ${i.plot.project.name}`,
      plotNumber: i.plot.plotNumber,
      projectName: i.plot.project.name,
      href: `/admin/plots/${i.plot.id}`,
      meta: i.type.replaceAll("_", " "),
    }))
    .filter((row) => !boughtLabels.has(row.label));

  const resalePlots = customer.plots
    .filter((p) => p.status === "RESALE_AVAILABLE" || p.resaleStatus)
    .map((p) => ({
      key: `resale-${p.id}`,
      plotNumber: p.plotNumber,
      projectName: p.project.name,
      href: `/admin/plots/${p.id}`,
      meta: "Resale",
    }));

  const primaryBooking =
    customer.bookings.find((b) => BOUGHT_BOOKING.has(b.bookingStatus)) ??
    customer.bookings.find((b) => ACTIVE_BOOKING.has(b.bookingStatus)) ??
    customer.bookings[0] ??
    null;

  const detailRows: DetailRow[] = [];

  if (primaryBooking) {
    detailRows.push({
      key: "plot",
      label: "Plot",
      value: `${primaryBooking.plot.plotNumber}, ${primaryBooking.project.name}`,
      href: `/admin/bookings/${primaryBooking.id}`,
    });
    detailRows.push({
      key: "booking-date",
      label: "Booking Date",
      value: formatIndianDate(primaryBooking.bookingDate),
    });
    detailRows.push({
      key: "amount",
      label: "Amount",
      value: formatINR(Number(primaryBooking.finalAmount)),
    });
  }

  const funnel = resolveFunnelStage({
    plots: customer.plots.map((p) => ({
      id: p.id,
      status: p.status,
      resaleStatus: p.resaleStatus,
    })),
    bookings: customer.bookings.map((b) => ({
      bookingStatus: b.bookingStatus,
      plotId: b.plot.id,
    })),
    interests: interests.map((i) => ({ type: i.type, plotId: i.plot.id })),
  });

  const statusChip = funnel.stage
    ? {
        key: funnel.stage,
        label: funnel.stage,
        count: funnel.count,
        pillClass: FUNNEL_PILL[funnel.stage],
      }
    : null;

  const statusItems: StatusItem[] = [];
  if (funnel.stage === "Interest") {
    for (const i of currentInterest) {
      statusItems.push({
        key: i.key,
        stage: "Interest",
        plotNumber: i.plotNumber,
        projectName: i.projectName,
        href: i.href,
        meta: i.meta,
      });
    }
  } else if (funnel.stage === "Booked") {
    for (const b of currentInProgress) {
      statusItems.push({
        key: b.key,
        stage: "Booked",
        plotNumber: b.plotNumber,
        projectName: b.projectName,
        href: b.href,
        meta: b.meta,
      });
    }
  } else if (funnel.stage === "Registered") {
    for (const p of boughtPlots) {
      statusItems.push({
        key: p.key,
        stage: "Registered",
        plotNumber: p.plotNumber,
        projectName: p.projectName,
        href: p.href,
        meta: [p.statusLabel, p.bookingDate, p.amount].filter(Boolean).join(" · "),
      });
    }
  } else if (funnel.stage === "Resale") {
    for (const p of resalePlots) {
      statusItems.push({
        key: p.key,
        stage: "Resale",
        plotNumber: p.plotNumber,
        projectName: p.projectName,
        href: p.href,
        meta: p.meta,
      });
    }
  }

  const addressLine = [customer.address, customer.city, customer.state, customer.pincode]
    .filter(Boolean)
    .join(", ");
  if (addressLine) {
    detailRows.push({ key: "address", label: "Address", value: addressLine });
  }
  if (customer.alternateMobile) {
    detailRows.push({
      key: "alt",
      label: "Alt. mobile",
      value: customer.alternateMobile,
    });
  }
  const nominee = [customer.nomineeName, customer.nomineeRelation, customer.nomineeMobile]
    .filter(Boolean)
    .join(" · ");
  if (nominee) {
    detailRows.push({ key: "nominee", label: "Nominee", value: nominee });
  }
  if (customer.supportNotes) {
    detailRows.push({ key: "notes", label: "Notes", value: customer.supportNotes });
  }

  const scheduleEvents: { dateKey: string; label: string }[] = [];
  for (const b of customer.bookings) {
    if (b.bookingStatus === "CANCELLED") continue;
    scheduleEvents.push({
      dateKey: toKey(new Date(b.bookingDate)),
      label: `Booking ${b.plot.plotNumber} · ${b.project.name}`,
    });
    for (const s of b.schedules) {
      scheduleEvents.push({
        dateKey: toKey(new Date(s.dueDate)),
        label: `Payment #${s.installmentNumber} due · ${b.plot.plotNumber} · ${formatINR(Number(s.amountDue))}`,
      });
    }
  }
  for (const i of interests.filter((x) => x.type === "CALLBACK_REQUEST")) {
    scheduleEvents.push({
      dateKey: toKey(new Date(i.createdAt)),
      label: `Callback · ${i.plot.plotNumber}, ${i.plot.project.name}`,
    });
  }
  for (const f of savedFollowUps) {
    const at = new Date(f.at!);
    if (Number.isNaN(at.getTime())) continue;
    const time = at.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    scheduleEvents.push({
      dateKey: toKey(at),
      label: `Follow-up · ${time}${f.note ? ` — ${f.note}` : ""}::${f.id}`,
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-1 sm:px-0">
      <div className="flex items-center gap-1 py-1">
        <Link
          href="/admin/customers"
          className="rounded-lg p-2 text-primary hover:bg-canvas"
          aria-label="Back to customers"
          title="Back to customers"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
        </Link>
        <div className="min-w-0 flex-1" />
        <FollowUpSchedulePopup customerId={customer.id} events={scheduleEvents} />
        <Link
          href={`/admin/customers/${customer.id}/edit`}
          className="rounded-lg p-2 text-muted-foreground hover:bg-canvas hover:text-primary"
          title="Edit customer details"
          aria-label="Edit customer details"
        >
          <Pencil className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>

      {sp.saved === "1" ? (
        <FlashToast message="Customer saved." />
      ) : null}
      {sp.followSaved === "1" ? (
        <FlashToast message="Follow-up scheduled." />
      ) : null}
      {sp.followError ? (
        <FlashToast
          variant="error"
          message={
            sp.followError === "time"
              ? "Enter a valid time (hour, minutes, AM/PM)."
              : "Could not schedule follow-up. Check the date."
          }
        />
      ) : null}

      {/* Mobile: stacked · Desktop: profile left, documents right */}
      <section className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-5 lg:col-span-7">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-semibold text-foreground">
              {initials(customer.fullName) || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <CustomerContactLines mobile={customer.mobile} email={customer.email} />
            </div>
          </div>

          <CustomerDetailBlock
            rows={[
              { key: "name", label: "Name", value: customer.fullName },
              ...detailRows,
            ]}
            statusChip={statusChip}
            statusItems={statusItems}
          />
        </div>

        <aside className="space-y-4 lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-8">
          <CustomerDocumentsSection
            customerId={customer.id}
            checklist={parseDocChecklist(customer.documentChecklist)}
            uploadedTitles={customer.documents.map((d) => d.title)}
          />
        </aside>
      </section>
    </div>
  );
}
