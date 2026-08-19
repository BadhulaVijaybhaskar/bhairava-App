import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { StatusBadge } from "@/components/mobile/status-badge";

export default async function MyPlotPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!session.customerId) {
    return (
      <div>
        <MobileHeader title="My Plot" backHref="/dashboard" />
        <div className="m-card p-4 text-[13px] text-[var(--muted)]">No customer profile linked.</div>
      </div>
    );
  }

  const booking = await prisma.booking.findFirst({
    where: { customerId: session.customerId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      plot: {
        select: {
          id: true,
          plotNumber: true,
          area: true,
          areaUnit: true,
          facing: true,
          status: true,
          totalPrice: true,
          block: { select: { name: true } },
        },
      },
    },
    orderBy: { bookingDate: "desc" },
  });

  if (!booking) {
    return (
      <div>
        <MobileHeader title="My Plot" backHref="/dashboard" />
        <div className="m-card p-4 text-center">
          <p className="text-[14px] font-semibold text-[var(--ink)]">No plot booked yet</p>
          <Link href="/projects" className="m-btn mt-4">
            Browse projects
          </Link>
        </div>
      </div>
    );
  }

  const layout = await prisma.layoutMap.findFirst({
    where: { projectId: booking.project.id, isActive: true },
    orderBy: { version: "desc" },
  });

  const areaUnit = booking.plot.areaUnit === "SQ_YARD" ? "Sq. Yds" : booking.plot.areaUnit;
  const rows = [
    { label: "Booking Date", value: booking.bookingDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
    { label: "Project", value: booking.project.name },
    { label: "Block", value: booking.plot.block?.name ?? "—" },
    { label: "Area", value: `${Number(booking.plot.area)} ${areaUnit}` },
    { label: "Facing", value: booking.plot.facing?.replaceAll("_", " ") ?? "—" },
    { label: "Price", value: formatINR(Number(booking.plot.totalPrice)) },
    { label: "Status", value: booking.plot.status },
  ];

  return (
    <div>
      <MobileHeader title="My Plot" backHref="/dashboard" />

      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--ink)]">
            {booking.plot.plotNumber}, {booking.project.name}
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            {booking.plot.block?.name ?? "Block"} | {Number(booking.plot.area)} {areaUnit}
            {booking.plot.facing ? ` | ${booking.plot.facing.replaceAll("_", " ")} Facing` : ""}
          </p>
        </div>
        <StatusBadge status={booking.plot.status} />
      </div>

      {layout ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layout.imagePath}
          alt="Plot layout"
          className="mb-3 h-[180px] w-full rounded-[12px] border border-[var(--border)] object-cover bg-white"
        />
      ) : (
        <div className="m-card mb-3 flex h-[140px] items-center justify-center text-[12px] text-[var(--muted)]">
          Layout image not uploaded yet
        </div>
      )}

      <div className="m-card divide-y divide-[var(--border)] px-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 py-2.5 text-[13px]">
            <span className="text-[var(--muted)]">{r.label}</span>
            <span className="text-right font-semibold text-[var(--ink)]">
              {r.label === "Status" ? <StatusBadge status={r.value} /> : r.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/projects/${booking.project.id}`} className="m-btn-outline m-btn">
          View Layout
        </Link>
        <Link href="/documents" className="m-btn">
          Plot Documents
        </Link>
      </div>
    </div>
  );
}
