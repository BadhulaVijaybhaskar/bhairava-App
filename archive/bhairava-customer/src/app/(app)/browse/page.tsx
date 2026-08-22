import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatINR } from "@/lib/utils";
import { InterestButton } from "./interest-button";

export default async function BrowsePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const plots = await prisma.plot.findMany({
    where: {
      organizationId: session.orgId,
      deletedAt: null,
      status: "AVAILABLE",
      project: { status: "ACTIVE", deletedAt: null },
    },
    include: {
      project: { select: { name: true, city: true } },
    },
    orderBy: [{ project: { name: "asc" } }, { plotNumber: "asc" }],
    take: 100,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Browse plots</h1>
      <p className="mt-1 text-sm text-muted">Available inventory — tap Interest to notify sales.</p>
      <div className="surface mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Plot</th>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {plots.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No available plots right now.
                </td>
              </tr>
            ) : (
              plots.map((p) => (
                <tr key={p.id} className="hover:bg-canvas/80">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{p.project.name}</div>
                    <div className="text-xs text-muted">{p.project.city ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{p.plotNumber}</td>
                  <td className="px-4 py-3 text-muted">
                    {Number(p.area)} {p.areaUnit?.replace("_", " ") ?? ""}
                  </td>
                  <td className="px-4 py-3">{formatINR(p.totalPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <InterestButton plotId={p.id} disabled={!session.customerId} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!session.customerId ? (
        <p className="mt-3 text-sm text-warning">
          Your login is not linked to a CRM customer record yet (match by email/mobile). Contact
          support.
        </p>
      ) : null}
    </div>
  );
}
