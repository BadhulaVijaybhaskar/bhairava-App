import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { PLOT_STATUS_COLORS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { MobileHeader } from "@/components/mobile/mobile-header";

export default async function CustomerProjectLayoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.orgId, deletedAt: null, status: "ACTIVE" },
    include: {
      plots: {
        where: { deletedAt: null },
        orderBy: { plotNumber: "asc" },
        select: {
          id: true,
          plotNumber: true,
          status: true,
          totalPrice: true,
          area: true,
          areaUnit: true,
          assignedCustomerId: true,
        },
      },
      layoutMaps: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
        include: {
          shapes: { include: { plot: { select: { id: true, status: true } } } },
        },
      },
    },
  });
  if (!project) notFound();
  const layout = project.layoutMaps[0];

  return (
    <div>
      <MobileHeader title="Layout View" backHref="/projects" />
      <p className="mb-2 text-[14px] font-semibold">{project.name}</p>

      {layout ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={layout.imagePath}
          alt={`${project.name} layout`}
          className="mb-2 max-h-[240px] w-full rounded-[12px] border border-[var(--border)] object-contain bg-white"
        />
      ) : null}

      {layout && layout.shapes.length > 0 ? (
        <div className="m-card mb-3 p-2">
          <svg viewBox="0 0 1 1" className="mx-auto max-h-48 w-full bg-[#faf8fc]">
            {layout.shapes.map((s) => {
              const color = PLOT_STATUS_COLORS[s.plot.status]?.hex ?? "#94A3B8";
              const coords = (Array.isArray(s.coordinates) ? s.coordinates : []) as [
                number,
                number,
              ][];
              return (
                <a key={s.id} href={`/plots/${s.plot.id}`}>
                  <polygon
                    points={coords.map((c) => c.join(",")).join(" ")}
                    fill={`${color}88`}
                    stroke={color}
                    strokeWidth={0.004}
                  />
                </a>
              );
            })}
          </svg>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {Object.values(PLOT_STATUS_COLORS).map((v) => (
          <span key={v.label} className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
            <span className="h-2 w-2 rounded-sm" style={{ background: v.hex }} />
            {v.label}
          </span>
        ))}
      </div>

      <div className="m-card px-3">
        {project.plots.map((p) => {
          const meta = PLOT_STATUS_COLORS[p.status];
          const mine = session.customerId && p.assignedCustomerId === session.customerId;
          return (
            <Link key={p.id} href={`/plots/${p.id}`} className="list-row">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">
                  {p.plotNumber}
                  {mine ? (
                    <span className="ml-1 text-[10px] font-bold text-[var(--brand)]">YOURS</span>
                  ) : null}
                </p>
                <p className="text-[11px] text-[var(--muted)]">
                  {p.status === "AVAILABLE" ? formatINR(Number(p.totalPrice)) : meta.label}
                </p>
              </div>
              <span className={`m-badge ${meta.bg} ${meta.text}`}>{meta.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
