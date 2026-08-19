import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, FilterBar, Metric, PageHeader } from "@/components/kit";
import { agents, bookings, byId, customers, formatINR, plots, projects } from "@/lib/mock-data";

export const Route = createFileRoute("/bookings/")({
  head: () => ({
    meta: [
      { title: "Bookings — Bhairava" },
      { name: "description", content: "Every booking across projects with stage, agent and payment progress." },
      { property: "og:title", content: "Bookings — Bhairava" },
      { property: "og:description", content: "Every booking across projects with stage, agent and payment progress." },
    ],
  }),
  component: BookingsIndex,
});

const stageViews = ["All", "Draft", "Confirmed", "Agreement", "Registered", "Cancelled"];

function BookingsIndex() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return bookings
      .map((b) => ({
        ...b,
        customer: byId(customers, b.customerId),
        plot: byId(plots, b.plotId),
        project: byId(projects, b.projectId),
        agent: byId(agents, b.agentId),
      }))
      .filter((b) => {
        if (active !== "All" && b.stage !== active) return false;
        if (
          query &&
          !`${b.id} ${b.customer?.name ?? ""} ${b.plot?.number ?? ""} ${b.project?.name ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [active, query]);

  const totalAmount = bookings.reduce((a, b) => a + b.amount, 0);
  const totalPaid = bookings.reduce((a, b) => a + b.paid, 0);
  const registered = bookings.filter((b) => b.stage === "Registered").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales"
        title="Bookings"
        description="Every plot booking across all projects, with stage, financials and progress."
      />

      <div className="grid gap-4 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total booked value" value={formatINR(totalAmount, { compact: true })} hint={`${bookings.length} bookings`} />
        <Metric label="Total collected" value={formatINR(totalPaid, { compact: true })} hint={`${Math.round((totalPaid / (totalAmount || 1)) * 100)}% of value`} />
        <Metric label="Registered" value={String(registered)} hint={`of ${bookings.length}`} />
        <Metric label="Avg ticket size" value={formatINR(totalAmount / (bookings.length || 1), { compact: true })} hint="per booking" />
      </div>

      <FilterBar
        views={stageViews}
        active={active}
        onSelect={setActive}
        query={query}
        onQuery={setQuery}
        placeholder="Search bookings, customer, plot…"
        right={<span className="numeric text-xs text-muted-foreground">{rows.length} results</span>}
      />

      <DataTable
        rows={rows}
        linkTo="/bookings/$bookingId"
        params={(r) => ({ bookingId: r.id })}
        columns={[
          {
            key: "id",
            header: "Booking",
            cell: (r) => (
              <Link to="/bookings/$bookingId" params={{ bookingId: r.id }} className="numeric text-xs font-medium hover:text-primary">
                {r.id}
              </Link>
            ),
          },
          { key: "customer", header: "Customer", cell: (r) => <span className="text-sm">{r.customer?.name ?? "—"}</span> },
          { key: "plot", header: "Plot", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.plot?.number ?? "—"}</span> },
          { key: "project", header: "Project", cell: (r) => <span className="text-xs text-muted-foreground">{r.project?.name ?? "—"}</span> },
          { key: "agent", header: "Agent", cell: (r) => <span className="text-xs text-muted-foreground">{r.agent?.name ?? "—"}</span> },
          { key: "stage", header: "Stage", cell: (r) => <Chip>{r.stage}</Chip> },
          { key: "date", header: "Date", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.date}</span> },
          {
            key: "progress",
            header: "Paid / Amount",
            cell: (r) => {
              const pct = Math.round((r.paid / (r.amount || 1)) * 100);
              return (
                <div className="w-32">
                  <div className="flex items-center justify-between">
                    <span className="numeric text-[11px] text-muted-foreground">{formatINR(r.paid, { compact: true })}</span>
                    <span className="numeric text-[11px] text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-c">
                    <div className="gradient-primary h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            },
          },
          {
            key: "amount",
            header: "Amount",
            align: "right",
            cell: (r) => <span className="numeric text-sm font-semibold">{formatINR(r.amount, { compact: true })}</span>,
          },
        ]}
      />
    </AppShell>
  );
}
