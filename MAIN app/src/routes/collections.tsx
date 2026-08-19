import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, Panel, SectionTitle } from "@/components/kit";
import { bookings, byId, cashflow, customers, formatINR, payments } from "@/lib/mock-data";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — Bhairava" },
      { name: "description", content: "Live collections, cashflow trend and recent payments across all Bhairava projects." },
      { property: "og:title", content: "Collections — Bhairava" },
      { property: "og:description", content: "Live collections, cashflow trend and recent payments across all Bhairava projects." },
    ],
  }),
  component: CollectionsPage,
});

const periods = ["3M", "6M", "8M", "YTD"] as const;
type Period = (typeof periods)[number];

function windowFor(period: Period) {
  if (period === "3M") return cashflow.slice(-3);
  if (period === "6M") return cashflow.slice(-6);
  return cashflow;
}

function CollectionsPage() {
  const [period, setPeriod] = useState<Period>("8M");
  const data = useMemo(() => windowFor(period), [period]);

  const collected = data.reduce((a, d) => a + d.collected, 0);
  const target = data.reduce((a, d) => a + d.target, 0);
  const outstanding = data.reduce((a, d) => a + d.outstanding, 0);
  const delta = target > 0 ? ((collected - target) / target) * 100 : 0;
  const efficiency = target > 0 ? (collected / target) * 100 : 0;

  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : undefined;
  const momDelta = last && prev ? ((last.collected - prev.collected) / prev.collected) * 100 : 0;

  const movements = [...data]
    .map((d, i, arr) => {
      const p = i > 0 ? arr[i - 1] : undefined;
      const change = p ? d.collected - p.collected : 0;
      return { ...d, change };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);

  const recentPayments = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12)
    .map((p) => ({
      ...p,
      customerName: byId(customers, p.customerId)?.name ?? "—",
      bookingId: byId(bookings, p.bookingId)?.id ?? p.bookingId,
    }));

  return (
    <AppShell>
      <div className="grid gap-4 pt-8 pb-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Finance · Collections
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <h1 className="numeric font-display text-6xl font-semibold tracking-tight">
              {formatINR(collected * 1e7, { compact: true })}
            </h1>
            <span
              className={`numeric mb-2 flex items-center gap-1 text-sm font-medium ${
                delta >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(delta).toFixed(1)}% vs target
            </span>
          </div>
          <p className="pt-2 text-sm text-muted-foreground">
            Total collected across the selected period, against a target of {formatINR(target * 1e7, { compact: true })}.
          </p>

          <div className="mt-6 flex gap-1 rounded-lg bg-surface-low p-1 w-fit">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  p === period ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="pt-6" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--outline-variant)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-lowest)",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`₹${v.toFixed(1)} Cr`, "Collected"]}
                />
                <Area type="monotone" dataKey="collected" stroke="var(--primary)" strokeWidth={2.5} fill="url(#collectedFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Outstanding</p>
            <p className="numeric pt-2 text-2xl font-semibold">{formatINR(outstanding * 1e7, { compact: true })}</p>
            <p className="pt-1 text-xs text-muted-foreground">across active bookings</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Overdue risk</p>
            <p className="numeric pt-2 text-2xl font-semibold">{formatINR(outstanding * 0.31 * 1e7, { compact: true })}</p>
            <p className="pt-1 text-xs text-muted-foreground">estimated 30+ days past due</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Collection efficiency</p>
            <p className="numeric pt-2 text-2xl font-semibold">{efficiency.toFixed(0)}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-c">
              <div className="gradient-primary h-full rounded-full" style={{ width: `${Math.min(100, efficiency)}%` }} />
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              {momDelta >= 0 ? "+" : ""}
              {momDelta.toFixed(1)}% vs previous month
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 pb-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionTitle>Top movements</SectionTitle>
          <Panel className="divide-y divide-transparent p-0">
            {movements.map((m) => (
              <div key={m.month} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium">{m.month}</p>
                  <p className="text-xs text-muted-foreground">collected {formatINR(m.collected * 1e7, { compact: true })}</p>
                </div>
                <span
                  className={`numeric flex items-center gap-1 text-sm font-medium ${
                    m.change >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {m.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {formatINR(Math.abs(m.change) * 1e7, { compact: true })}
                </span>
              </div>
            ))}
          </Panel>
        </div>

        <div className="lg:col-span-8">
          <SectionTitle aside={`${recentPayments.length} transactions`}>Recent transactions</SectionTitle>
          <DataTable
            rows={recentPayments}
            linkTo="/payments/$paymentId"
            params={(r) => ({ paymentId: r.id })}
            columns={[
              { key: "id", header: "Payment", cell: (r) => <span className="numeric text-xs">{r.id}</span> },
              { key: "customer", header: "Customer", cell: (r) => <span className="text-sm">{r.customerName}</span> },
              { key: "booking", header: "Booking", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.bookingId}</span> },
              { key: "mode", header: "Mode", cell: (r) => <span className="text-xs text-muted-foreground">{r.mode}</span> },
              { key: "status", header: "Status", cell: (r) => <Chip>{r.status}</Chip> },
              { key: "date", header: "Date", cell: (r) => <span className="numeric text-xs text-muted-foreground">{r.date}</span> },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                cell: (r) => <span className="numeric text-sm font-semibold">{formatINR(r.amount, { compact: true })}</span>,
              },
            ]}
          />
        </div>
      </div>
    </AppShell>
  );
}
