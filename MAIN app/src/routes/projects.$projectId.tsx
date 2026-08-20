import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, DataTable, Panel, RecordHeader, SectionTitle, Timeline } from "@/components/kit";
import { ScrollTabs } from "@/components/scroll-tabs";
import { BookingCard } from "@/components/booking-card";
import {
  bookings,
  byId,
  customers,
  documents,
  formatINR,
  plots,
  projects,
  salesTrend,
} from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { ProjectEditor } from "@/components/record-editors";

export const Route = createFileRoute("/projects/$projectId")({
  head: ({ params }) => {
    const project = byId(projects, params.projectId);
    const title = project ? `${project.name} — Project record` : "Project not found";
    return {
      meta: [
        { title: `${title} — Bhairava` },
        { name: "description", content: `Record details, plots, customers and documents for ${project?.name ?? "this project"}.` },
        { property: "og:title", content: `${title} — Bhairava` },
        { property: "og:description", content: `Record details, plots, customers and documents for ${project?.name ?? "this project"}.` },
      ],
    };
  },
  component: ProjectRecord,
});

const chartAxis = {
  stroke: "var(--outline-variant)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
};

const tabs = ["Overview", "Plots", "Customers", "Bookings", "Documents"] as const;
type Tab = (typeof tabs)[number];

function ProjectRecord() {
  const { projectId } = Route.useParams();
  const { projects: projectList } = useData();
  const project = byId(projectList, projectId);
  const [tab, setTab] = useState<Tab>("Overview");

  if (!project) {
    return (
      <AppShell>
        <Panel className="mt-10 text-center">
          <h2 className="font-display text-lg font-semibold">Project not found</h2>
          <p className="pt-2 text-sm text-muted-foreground">
            No project matches “{projectId}”. It may have been archived or renamed.
          </p>
          <Link to="/projects" className="mt-4 inline-flex text-sm font-medium text-primary">
            Back to Project Portfolio
          </Link>
        </Panel>
      </AppShell>
    );
  }

  const projectPlots = plots.filter((p) => p.projectId === project.id);
  const projectCustomers = customers.filter((c) => c.plots.some((pid) => byId(plots, pid)?.projectId === project.id));
  const projectBookings = bookings.filter((b) => b.projectId === project.id);
  const projectDocuments = documents.filter((d) => d.projectId === project.id);

  const trend = salesTrend.map((s, i) => ({
    month: s.month,
    absorption: Math.min(100, Math.round(((project.soldPlots * (i + 1)) / salesTrend.length / project.totalPlots) * 100)),
  }));

  const activity = [
    { time: "2h ago", title: "Payment received", detail: `${projectCustomers[0]?.name ?? "Customer"} · installment` },
    { time: "1d ago", title: "Plot registered", detail: `${projectPlots.find((p) => p.status === "registered")?.number ?? "—"}` },
    { time: "3d ago", title: "New booking confirmed", detail: `${projectBookings[0]?.id ?? "—"}` },
    { time: "6d ago", title: "Layout approval updated", detail: project.approvals.join(", ") },
  ];

  return (
    <AppShell>
      <RecordHeader
        eyebrow={project.code}
        title={project.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>{project.location}, {project.city}</span>
            <Chip>{project.status}</Chip>
            {project.approvals.map((a) => (
              <Chip key={a} tone="info">{a}</Chip>
            ))}
          </div>
        }
        facts={[
          { label: "Total plots", value: project.totalPlots },
          { label: "Sold", value: `${project.soldPlots} (${Math.round((project.soldPlots / project.totalPlots) * 100)}%)` },
          { label: "Value", value: formatINR(project.valueCr * 1e7, { compact: true }) },
          { label: "Collected", value: formatINR(project.collectedCr * 1e7, { compact: true }) },
          { label: "Launch date", value: project.launchDate },
          { label: "Manager", value: project.manager },
        ]}
        actions={
          <>
          <ProjectEditor project={project} />
          <Link
            to="/plots/layout"
            className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Open live layout <ArrowUpRight className="h-4 w-4" />
          </Link>
          </>
        }
      />

      <ScrollTabs activeKey={tab} className="mt-6 rounded-xl bg-surface-low p-1 lg:overflow-x-visible">
        {tabs.map((t) => (
          <button
            key={t}
            data-active={tab === t ? "true" : undefined}
            onClick={() => setTab(t)}
            className={`flex-none whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-1 ${
              tab === t ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c"
            }`}
          >
            {t}
          </button>
        ))}
      </ScrollTabs>

      <div className="pt-6">
        {tab === "Overview" && (
          <div className="grid gap-4 lg:grid-cols-12">
            <Panel className="lg:col-span-7">
              <SectionTitle aside="Derived from monthly sales trend">Absorption trend</SectionTitle>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ left: -20, right: 4, top: 8 }}>
                    <defs>
                      <linearGradient id="absorption" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                    <XAxis dataKey="month" {...chartAxis} />
                    <YAxis {...chartAxis} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-lowest)",
                        border: "none",
                        borderRadius: 12,
                        boxShadow: "var(--shadow-float)",
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="absorption" stroke="var(--primary)" strokeWidth={2} fill="url(#absorption)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel className="lg:col-span-5" tonal>
              <SectionTitle>Recent activity</SectionTitle>
              <Timeline items={activity} />
            </Panel>
          </div>
        )}

        {tab === "Plots" && (
          <div>
            <div className="flex items-center justify-end pb-3">
              <Link to="/plots/layout" className="text-sm font-medium text-primary">
                Open live plot layout →
              </Link>
            </div>
            <DataTable
              rows={projectPlots}
              columns={[
                { key: "number", header: "Plot", cell: (r) => <span className="numeric">{r.number}</span> },
                { key: "area", header: "Area (sq.yd)", cell: (r) => <span className="numeric">{r.areaSqYd}</span> },
                { key: "facing", header: "Facing", cell: (r) => r.facing },
                {
                  key: "price",
                  header: "Price/sq.yd",
                  align: "right",
                  cell: (r) => <span className="numeric">{formatINR(r.pricePerSqYd)}</span>,
                },
                { key: "status", header: "Status", cell: (r) => <Chip>{r.status}</Chip> },
              ]}
            />
          </div>
        )}

        {tab === "Customers" && (
          <DataTable
            rows={projectCustomers}
            linkTo="/customers/$customerId"
            params={(r) => ({ customerId: r.id })}
            columns={[
              { key: "name", header: "Customer", cell: (r) => r.name },
              { key: "phone", header: "Phone", cell: (r) => <span className="numeric">{r.phone}</span> },
              { key: "stage", header: "Stage", cell: (r) => <Chip>{r.stage}</Chip> },
              {
                key: "value",
                header: "Value",
                align: "right",
                cell: (r) => <span className="numeric">{formatINR(r.totalValue, { compact: true })}</span>,
              },
            ]}
          />
        )}

        {tab === "Bookings" && (
          <DataTable
            rows={projectBookings}
            linkTo="/bookings/$bookingId"
            params={(r) => ({ bookingId: r.id })}
            renderMobileCard={(r) => <BookingCard booking={r} />}
            columns={[
              { key: "id", header: "Booking", cell: (r) => <span className="numeric">{r.id}</span> },
              { key: "cust", header: "Customer", cell: (r) => byId(customers, r.customerId)?.name ?? "—" },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                cell: (r) => <span className="numeric">{formatINR(r.amount, { compact: true })}</span>,
              },
              { key: "stage", header: "Stage", cell: (r) => <Chip>{r.stage}</Chip> },
            ]}
          />
        )}

        {tab === "Documents" && (
          <DataTable
            rows={projectDocuments}
            columns={[
              { key: "name", header: "Document", cell: (r) => r.name },
              { key: "type", header: "Type", cell: (r) => r.type },
              { key: "modified", header: "Modified", cell: (r) => <span className="numeric">{r.modified}</span> },
              { key: "verified", header: "Status", cell: (r) => <Chip>{r.verified}</Chip> },
            ]}
          />
        )}
      </div>
    </AppShell>
  );
}
