import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { EmptyState } from "@/components/mobile/empty-state";

export default async function AgentCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();

  const [fromBookings, createdByAgent] = await Promise.all([
    prisma.booking.findMany({
      where: { agentId: session.agentId, deletedAt: null },
      select: {
        customer: {
          select: { id: true, fullName: true, mobile: true, email: true, city: true },
        },
      },
    }),
    prisma.customer.findMany({
      where: { organizationId: session.orgId, deletedAt: null, createdBy: session.sub },
      select: { id: true, fullName: true, mobile: true, email: true, city: true },
    }),
  ]);

  const map = new Map<string, (typeof createdByAgent)[0]>();
  for (const c of createdByAgent) map.set(c.id, c);
  for (const b of fromBookings) if (b.customer) map.set(b.customer.id, b.customer);
  let customers = [...map.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
  if (q) {
    customers = customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q),
    );
  }

  return (
    <div>
      <MobileHeader
        title="Customers"
        showMenu
        showBell
        right={
          <Link
            href="/customers/new"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--brand)]"
            aria-label="Add customer"
          >
            <Plus size={20} />
          </Link>
        }
      />

      <form className="mb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Search customers"
            className="m-input !h-11 !pl-9"
          />
        </div>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          message="No customers found"
          action={
            <Link href="/customers/new" className="m-btn">
              Add customer
            </Link>
          }
        />
      ) : (
        <div className="m-card px-3">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="list-row">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                {c.fullName
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{c.fullName}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.mobile}
                  {c.city ? ` · ${c.city}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
