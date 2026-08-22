"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Phone, Mail, MapPin, ArrowLeft, Receipt, CreditCard, FileText } from "lucide-react";
import { PageHeader, Panel, SectionTitle, Chip, DataTable, RecordHeader, Btn, Timeline } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import {
  customers,
  plots,
  bookings,
  payments,
  documents,
  byId,
  agents,
  formatINR,
  type Plot,
  type Booking,
  type Payment,
  type DocumentRecord,
} from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { CustomerEditor } from "@/components/record-editors";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const tabs = ["Plots", "Bookings", "Payments", "Documents"] as const;
type Tab = (typeof tabs)[number];

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const { customers: customerList } = useData();
  const customer = byId(customerList, customerId);
  const [tab, setTab] = useState<Tab>("Plots");

  if (!customer) {
    return (
      <AppShell>
        <PageHeader eyebrow="Customers" title="Not found" />
        <Panel className="text-center">
          <p className="text-sm text-muted-foreground">No customer matches “{customerId}”.</p>
          <div className="pt-4">
            <Link href="/customers" className="text-sm font-medium text-primary">
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back to customers
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const agent = byId(agents, customer.agentId);
  const customerPlots = plots.filter((p) => p.customerId === customer.id);
  const customerBookings = bookings.filter((b) => b.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const customerDocs = documents.filter((d) => d.customerId === customer.id);
  const balance = customer.totalValue - customer.paid;

  const timeline = [
    { time: customer.createdAt, title: "Added as lead", detail: `Source: ${customer.source}` },
    ...customerBookings.map((b) => ({ time: b.date, title: `Booking ${b.stage.toLowerCase()}`, detail: `${b.id} · ${formatINR(b.amount, { compact: true })}` })),
    ...customerPayments.slice(0, 3).map((p) => ({ time: p.date, title: `Payment ${p.status.toLowerCase()}`, detail: `${formatINR(p.amount, { compact: true })} via ${p.mode}` })),
  ];

  return (
    <AppShell>
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <RecordHeader
        eyebrow="Customer"
        title={customer.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-c text-[10px] font-semibold">
              {initials(customer.name)}
            </span>
            {customer.email}
          </span>
        }
        actions={
          <>
            <CustomerEditor customer={customer} />
            <Btn variant="tonal">Log activity</Btn>
            <Btn variant="primary">New booking</Btn>
          </>
        }
        facts={[
          { label: "Stage", value: <Chip>{customer.stage}</Chip> },
          { label: "Agent", value: agent?.name ?? "—" },
          { label: "Source", value: customer.source },
          { label: "City", value: customer.city },
          { label: "Total value", value: formatINR(customer.totalValue, { compact: true }) },
          { label: "Paid", value: formatINR(customer.paid, { compact: true }) },
          { label: "Balance", value: formatINR(balance, { compact: true }) },
          { label: "Since", value: customer.createdAt },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap gap-2 pb-4">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
                  (t === tab ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Plots" && (
            <DataTable<Plot>
              rows={customerPlots}
              columns={[
                { key: "number", header: "Plot", cell: (p) => <span className="numeric text-xs font-medium">{p.number}</span> },
                { key: "project", header: "Project", cell: (p) => <span className="text-xs text-muted-foreground">{p.projectId}</span> },
                { key: "area", header: "Area", align: "right", cell: (p) => <span className="numeric text-xs">{p.areaSqYd} sq.yd</span> },
                { key: "facing", header: "Facing", cell: (p) => <span className="text-xs text-muted-foreground">{p.facing}</span> },
                { key: "status", header: "Status", cell: (p) => <Chip>{p.status}</Chip> },
              ]}
            />
          )}

          {tab === "Bookings" && (
            <DataTable<Booking>
              rows={customerBookings}
              columns={[
                { key: "id", header: "Booking", cell: (b) => <span className="numeric text-xs font-medium">{b.id}</span> },
                { key: "plot", header: "Plot", cell: (b) => <span className="numeric text-xs">{b.plotId}</span> },
                { key: "amount", header: "Amount", align: "right", cell: (b) => <span className="numeric text-xs">{formatINR(b.amount, { compact: true })}</span> },
                { key: "paid", header: "Paid", align: "right", cell: (b) => <span className="numeric text-xs">{formatINR(b.paid, { compact: true })}</span> },
                { key: "date", header: "Date", cell: (b) => <span className="numeric text-xs text-muted-foreground">{b.date}</span> },
                { key: "stage", header: "Stage", cell: (b) => <Chip>{b.stage}</Chip> },
              ]}
            />
          )}

          {tab === "Payments" && (
            <DataTable<Payment>
              rows={customerPayments}
              columns={[
                { key: "id", header: "Payment", cell: (p) => <span className="numeric text-xs font-medium">{p.id}</span> },
                { key: "amount", header: "Amount", align: "right", cell: (p) => <span className="numeric text-xs">{formatINR(p.amount, { compact: true })}</span> },
                { key: "mode", header: "Mode", cell: (p) => <span className="text-xs text-muted-foreground">{p.mode}</span> },
                { key: "reference", header: "Reference", cell: (p) => <span className="numeric text-xs text-muted-foreground">{p.reference}</span> },
                { key: "date", header: "Date", cell: (p) => <span className="numeric text-xs text-muted-foreground">{p.date}</span> },
                { key: "status", header: "Status", cell: (p) => <Chip>{p.status}</Chip> },
              ]}
            />
          )}

          {tab === "Documents" && (
            <DataTable<DocumentRecord>
              rows={customerDocs}
              columns={[
                { key: "name", header: "Document", cell: (d) => <span className="text-xs font-medium">{d.name}</span> },
                { key: "type", header: "Type", cell: (d) => <span className="text-xs text-muted-foreground">{d.type}</span> },
                { key: "modified", header: "Modified", cell: (d) => <span className="numeric text-xs text-muted-foreground">{d.modified}</span> },
                { key: "verified", header: "Status", cell: (d) => <Chip>{d.verified}</Chip> },
              ]}
            />
          )}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Panel>
            <SectionTitle>Activity</SectionTitle>
            <Timeline items={timeline.length ? timeline : [{ time: customer.createdAt, title: "Lead created" }]} />
          </Panel>

          <Panel tonal>
            <SectionTitle>Contact details</SectionTitle>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> <span className="numeric text-foreground">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> <span className="text-foreground">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> <span className="text-foreground">{customer.city}</span>
              </div>
            </div>
          </Panel>

          {agent && (
            <Panel>
              <SectionTitle>Assigned agent</SectionTitle>
              <Link href={`/agents/${agent.id}`} className="flex items-center gap-3 rounded-lg p-2 -m-2 hover:bg-surface-low">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                  {agent.code}
                </span>
                <div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.region}</p>
                </div>
              </Link>
            </Panel>
          )}

          <Panel>
            <SectionTitle>Quick actions</SectionTitle>
            <div className="flex flex-col gap-2">
              <Btn variant="tonal"><Receipt className="h-4 w-4" /> Create booking</Btn>
              <Btn variant="tonal"><CreditCard className="h-4 w-4" /> Record payment</Btn>
              <Btn variant="tonal"><FileText className="h-4 w-4" /> Request document</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
