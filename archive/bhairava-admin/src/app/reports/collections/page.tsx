"use client";
import { useMemo, useState } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Metric, DataTable, Chip, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { cashflow, payments, customers, bookings, byId, formatINR, projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function CollectionsReport() {
  const [projectId, setProjectId] = useState("All");

  const outstandingByProject = useMemo(() => {
    return projects
      .map((p) => ({ name: p.code, value: Math.max(p.valueCr - p.collectedCr, 0) }))
      .sort((a, b) => b.value - a.value);
  }, []);

  const maxOutstanding = Math.max(...outstandingByProject.map((p) => p.value), 1);

  const filteredPayments = useMemo(() => {
    const rows = projectId === "All" ? payments : payments.filter((p) => byId(bookings, p.bookingId)?.projectId === projectId);
    return rows.slice(0, 20);
  }, [projectId]);

  const totalCollected = cashflow.reduce((a, c) => a + c.collected, 0);
  const totalTarget = cashflow.reduce((a, c) => a + c.target, 0);
  const totalOutstanding = cashflow[cashflow.length - 1]?.outstanding ?? 0;
  const attainment = Math.round((totalCollected / (totalTarget || 1)) * 100);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Reports"
        title="Collections"
        description="Cashflow health, target attainment and outstanding exposure by project."
        actions={
          <Btn variant="tonal">
            <Download className="h-4 w-4" /> Download report
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Collected (8mo)" value={`₹${totalCollected.toFixed(1)} Cr`} />
        <Metric label="Target" value={`₹${totalTarget.toFixed(1)} Cr`} />
        <Metric label="Attainment" value={`${attainment}%`} delta={attainment >= 100 ? "+on track" : "-behind"} />
        <Metric label="Outstanding" value={`₹${totalOutstanding.toFixed(1)} Cr`} hint="latest month" />
      </div>

      <div className="flex flex-wrap gap-2 pt-6 pb-2">
        {["All", ...projects.map((p) => p.id)].map((id) => (
          <button
            key={id}
            onClick={() => setProjectId(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              id === projectId ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c",
            )}
          >
            {id === "All" ? "All projects" : byId(projects, id)?.code}
          </button>
        ))}
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside="₹ Cr — collected vs target">Cashflow trend</SectionTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashflow}>
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="collected" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={22} />
                <Line type="monotone" dataKey="target" stroke="var(--secondary)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle aside="₹ Cr">Outstanding by project</SectionTitle>
          <div className="space-y-3 pt-1">
            {outstandingByProject.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-medium">{p.name}</span>
                  <span className="numeric text-xs text-muted-foreground">₹{p.value.toFixed(1)} Cr</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-c">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${(p.value / maxOutstanding) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle>Recent payments</SectionTitle>
        <DataTable
          rows={filteredPayments}
          columns={[
            { key: "id", header: "Payment", cell: (p) => <span className="numeric text-sm font-medium">{p.id}</span> },
            { key: "customer", header: "Customer", cell: (p) => <span className="text-sm">{byId(customers, p.customerId)?.name ?? "—"}</span> },
            { key: "mode", header: "Mode", cell: (p) => <Chip tone="neutral">{p.mode}</Chip> },
            { key: "reference", header: "Reference", cell: (p) => <span className="numeric text-xs text-muted-foreground">{p.reference}</span> },
            { key: "status", header: "Status", cell: (p) => <Chip>{p.status}</Chip> },
            { key: "amount", header: "Amount", align: "right", cell: (p) => <span className="numeric text-sm font-medium">{formatINR(p.amount, { compact: true })}</span> },
          ]}
        />
      </div>
    </AppShell>
  );
}
