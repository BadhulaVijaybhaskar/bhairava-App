import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Chip, Metric, PageHeader, SectionTitle } from "@/components/kit";
import { bookings, byId, customers, formatINR } from "@/lib/mock-data";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Payment Schedule — Bhairava" },
      { name: "description", content: "Instalment timeline grouped by overdue, due this month, upcoming and paid." },
      { property: "og:title", content: "Payment Schedule — Bhairava" },
      { property: "og:description", content: "Instalment timeline grouped by overdue, due this month, upcoming and paid." },
    ],
  }),
  component: SchedulePage,
});

const TODAY = new Date("2026-08-19");

interface Instalment {
  id: string;
  bookingId: string;
  customerName: string;
  amount: number;
  due: string;
  bucket: "Overdue" | "Due this month" | "Upcoming" | "Paid";
}

function buildInstalments(): Instalment[] {
  const out: Instalment[] = [];
  bookings.forEach((b, i) => {
    const remaining = Math.max(0, b.amount - b.paid);
    const parts = remaining > 0 ? 3 : 0;
    const customer = byId(customers, b.customerId);
    const paidCount = b.stage === "Registered" ? 1 : 0;

    for (let k = 0; k < paidCount; k++) {
      out.push({
        id: `${b.id}-P${k}`,
        bookingId: b.id,
        customerName: customer?.name ?? "—",
        amount: b.paid,
        due: b.date,
        bucket: "Paid",
      });
    }

    for (let k = 0; k < parts; k++) {
      const monthOffset = ((i + k) % 5) - 2; // -2..2 months from today
      const d = new Date(TODAY);
      d.setMonth(d.getMonth() + monthOffset);
      d.setDate(((i * 7 + k * 11) % 27) + 1);
      const dueStr = d.toISOString().slice(0, 10);
      let bucket: Instalment["bucket"];
      if (d < TODAY) bucket = "Overdue";
      else if (d.getMonth() === TODAY.getMonth() && d.getFullYear() === TODAY.getFullYear()) bucket = "Due this month";
      else bucket = "Upcoming";

      out.push({
        id: `${b.id}-INST-${k}`,
        bookingId: b.id,
        customerName: customer?.name ?? "—",
        amount: Math.round(remaining / parts),
        due: dueStr,
        bucket,
      });
    }
  });
  return out.sort((a, b) => (a.due < b.due ? -1 : 1));
}

const bucketOrder: Instalment["bucket"][] = ["Overdue", "Due this month", "Upcoming", "Paid"];

function SchedulePage() {
  const instalments = useMemo(buildInstalments, []);

  const overdueTotal = instalments.filter((i) => i.bucket === "Overdue").reduce((a, i) => a + i.amount, 0);
  const dueThisMonthTotal = instalments.filter((i) => i.bucket === "Due this month").reduce((a, i) => a + i.amount, 0);
  const upcomingTotal = instalments.filter((i) => i.bucket === "Upcoming").reduce((a, i) => a + i.amount, 0);
  const paidTotal = instalments.filter((i) => i.bucket === "Paid").reduce((a, i) => a + i.amount, 0);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    instalments
      .filter((i) => i.bucket !== "Paid")
      .forEach((i) => {
        const key = i.due.slice(0, 7);
        map.set(key, (map.get(key) ?? 0) + i.amount);
      });
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, amount]) => ({ month, amount: Math.round(amount / 100000) / 10 }));
  }, [instalments]);

  let running = 0;
  const withRunning = instalments.map((i) => {
    running += i.amount;
    return { ...i, running };
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Finance"
        title="Payment Schedule"
        description="Instalment timeline across all active bookings, grouped by urgency."
      />

      <div className="grid gap-4 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Overdue" value={formatINR(overdueTotal, { compact: true })} hint={`${instalments.filter((i) => i.bucket === "Overdue").length} instalments`} />
        <Metric label="Due this month" value={formatINR(dueThisMonthTotal, { compact: true })} />
        <Metric label="Upcoming" value={formatINR(upcomingTotal, { compact: true })} />
        <Metric label="Collected" value={formatINR(paidTotal, { compact: true })} />
      </div>

      <div className="pb-10">
        <SectionTitle>Expected inflow by month</SectionTitle>
        <div className="panel p-6" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
              <Tooltip
                contentStyle={{ background: "var(--surface-lowest)", border: "none", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [`₹${v.toFixed(1)} L`, "Expected"]}
              />
              <Bar dataKey="amount" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-10 pb-12">
        {bucketOrder.map((bucket) => {
          const rows = withRunning.filter((i) => i.bucket === bucket).slice(0, 40);
          if (rows.length === 0) return null;
          return (
            <div key={bucket}>
              <SectionTitle aside={`${rows.length} shown`}>{bucket}</SectionTitle>
              <div className="panel divide-y divide-transparent overflow-hidden p-0">
                {rows.map((r, i) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-2 items-center gap-x-4 gap-y-1.5 px-4 py-3.5 sm:px-5 lg:grid-cols-12 lg:gap-4 ${i % 2 === 1 ? "bg-surface/60" : ""}`}
                  >
                    <div className="numeric order-1 col-span-1 text-xs text-muted-foreground lg:col-span-2">{r.due}</div>
                    <div className="order-3 col-span-2 truncate text-sm lg:order-2 lg:col-span-3">{r.customerName}</div>
                    <div className="order-4 col-span-1 lg:order-3 lg:col-span-2">
                      <Link to="/bookings/$bookingId" params={{ bookingId: r.bookingId }} className="numeric text-xs text-muted-foreground hover:text-primary">
                        {r.bookingId}
                      </Link>
                    </div>
                    <div className="order-2 col-span-1 flex justify-end lg:order-4 lg:col-span-2 lg:justify-start">
                      <Chip tone={bucket === "Overdue" ? "danger" : bucket === "Paid" ? "positive" : bucket === "Due this month" ? "warning" : "neutral"}>
                        {bucket}
                      </Chip>
                    </div>
                    <div className="numeric order-6 col-span-1 hidden text-right text-xs text-muted-foreground lg:order-5 lg:col-span-1 lg:block">
                      {formatINR(r.running, { compact: true })}
                    </div>
                    <div className="numeric order-5 col-span-1 text-right text-sm font-semibold lg:order-6 lg:col-span-2">
                      {formatINR(r.amount, { compact: true })}
                    </div>
                  </div>

                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
