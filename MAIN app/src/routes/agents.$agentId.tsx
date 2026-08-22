import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader, Panel, SectionTitle, Metric, Chip, DataTable, RecordHeader } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { customers, bookings, projects, byId, formatINR, salesTrend, type Customer, type Booking } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { AgentEditor } from "@/components/record-editors";

export const Route = createFileRoute("/agents/$agentId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.agentId} · Agent — Bhairava` },
      { name: "description", content: "Agent performance record: bookings, sales, conversion and targets." },
      { property: "og:title", content: `${params.agentId} · Agent — Bhairava` },
      { property: "og:description", content: "Agent performance record: bookings, sales, conversion and targets." },
    ],
  }),
  component: AgentDetail,
});

function AgentDetail() {
  const { agentId } = Route.useParams();
  const { agents } = useData();
  const agent = byId(agents, agentId);

  if (!agent) {
    return (
      <AppShell>
        <PageHeader eyebrow="Agents" title="Not found" />
        <Panel className="text-center">
          <p className="text-sm text-muted-foreground">No agent matches “{agentId}”.</p>
          <div className="pt-4">
            <Link to="/agents" className="text-sm font-medium text-primary">
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" /> Back to agents
            </Link>
          </div>
        </Panel>
      </AppShell>
    );
  }

  const agentIdx = agents.findIndex((a) => a.id === agent.id);
  const scale = 0.5 + ((agentIdx + 1) / agents.length) * 0.9;
  const monthly = salesTrend.map((m) => ({ month: m.month, bookings: Math.max(1, Math.round(m.bookings * scale * 0.4)) }));

  const agentCustomers = customers.filter((c) => c.agentId === agent.id);
  const agentBookings = bookings.filter((b) => b.agentId === agent.id);
  const agentProjects = agent.projects.map((id) => byId(projects, id)).filter((p): p is NonNullable<typeof p> => !!p);
  const attainment = Math.min(150, Math.round((agent.bookings / agent.target) * 100));

  return (
    <AppShell>
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All agents
      </Link>

      <RecordHeader
        actions={<AgentEditor agent={agent} />}
        eyebrow="Agent"
        title={agent.name}
        subtitle={
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-c text-[10px] font-semibold">
              {agent.code}
            </span>
            {agent.region} · {agent.phone}
          </span>
        }
        facts={[
          { label: "Agent ID", value: <span className="numeric">{agent.id}</span> },
          { label: "Status", value: <Chip>{agent.status}</Chip> },
          { label: "Region", value: agent.region },
          { label: "Projects", value: String(agent.projects.length) },
          { label: "Target", value: String(agent.target) },
        ]}
      />

      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Bookings" value={String(agent.bookings)} hint={`vs target ${agent.target}`} />
        <Metric label="Sales" value={`₹${agent.salesCr.toFixed(1)} Cr`} hint="lifetime" />
        <Metric label="Conversion" value={`${Math.round(agent.conversion * 100)}%`} hint="visit to booking" />
        <Metric
          label="Target attainment"
          value={`${attainment}%`}
          hint={attainment >= 100 ? "above target" : "below target"}
          accent={attainment >= 100}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Panel>
            <SectionTitle aside="Last 8 months">Monthly bookings trend</SectionTitle>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--outline-variant)" />
                  <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="bookings" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Customers</SectionTitle>
            <DataTable<Customer>
              rows={agentCustomers}
              linkTo="/customers/$customerId"
              params={(c) => ({ customerId: c.id })}
              columns={[
                { key: "name", header: "Customer", cell: (c) => <span className="text-sm font-medium">{c.name}</span> },
                { key: "stage", header: "Stage", cell: (c) => <Chip>{c.stage}</Chip> },
                { key: "value", header: "Value", align: "right", cell: (c) => <span className="numeric text-xs">{formatINR(c.totalValue, { compact: true })}</span> },
              ]}
            />
          </Panel>

          <Panel>
            <SectionTitle>Bookings</SectionTitle>
            <DataTable<Booking>
              rows={agentBookings}
              columns={[
                { key: "id", header: "Booking", cell: (b) => <span className="numeric text-xs font-medium">{b.id}</span> },
                { key: "amount", header: "Amount", align: "right", cell: (b) => <span className="numeric text-xs">{formatINR(b.amount, { compact: true })}</span> },
                { key: "date", header: "Date", cell: (b) => <span className="numeric text-xs text-muted-foreground">{b.date}</span> },
                { key: "stage", header: "Stage", cell: (b) => <Chip>{b.stage}</Chip> },
              ]}
            />
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Panel tonal>
            <SectionTitle>Assigned projects</SectionTitle>
            <div className="space-y-3">
              {agentProjects.map((p) => (
                <div key={p.id} className="rounded-lg bg-surface-low p-3">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.location} · {p.city}</p>
                  <p className="numeric pt-1 text-xs text-muted-foreground">{p.soldPlots}/{p.totalPlots} sold</p>
                </div>
              ))}
              {agentProjects.length === 0 && <p className="text-xs text-muted-foreground">No projects assigned.</p>}
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Bookings by month</SectionTitle>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--outline-variant)" />
                  <Tooltip contentStyle={{ background: "var(--surface-highest)", border: "none", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="bookings" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
