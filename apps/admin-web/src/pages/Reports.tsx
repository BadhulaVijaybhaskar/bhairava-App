import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PLOT_STATUSES, type CanonicalPlotStatus } from '@bhairava/domain';
import {
  Chip,
  DataTable,
  EmptyState,
  ErrorState,
  LinkBtn,
  LoadingState,
  Metric,
  PageHeader,
  Panel,
  PlotStatusChip,
  SectionTitle,
  cn,
  plotStatusColors,
  plotStatusLabel,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Mono, Muted, StatusChip } from '../components/common';
import { DASH, display, errMsg, formatDate, formatPaise, formatRupees, humanize, shortId, withIds, type AnyRow } from '../lib/data';

export type ReportFocus = 'sales' | 'inventory' | 'collections' | 'agents' | 'customers' | 'registrations' | 'resale';

const TITLES: Record<ReportFocus, { title: string; description: string }> = {
  sales: { title: 'Sales performance', description: 'Bookings velocity and booking value across the portfolio.' },
  inventory: { title: 'Inventory status', description: 'Plot status mix across every project, with drill-down detail.' },
  collections: { title: 'Collections', description: 'Recorded (non-voided) payments, monthly cash-in and how it was received.' },
  agents: { title: 'Agent performance', description: 'Channel partners ranked by the bookings they drive.' },
  customers: { title: 'Customers report', description: 'Customer base size, geography and conversion into bookings.' },
  registrations: { title: 'Registrations report', description: 'Sale-deed registrations by status.' },
  resale: { title: 'Resale report', description: 'Resale listings by status.' },
};

/* ---------------------------------- data ---------------------------------- */

type ReportData = {
  summary: AnyRow;
  bookings: AnyRow[];
  projects: AnyRow[];
  payments: AnyRow[];
  agents: AnyRow[];
  plots: AnyRow[];
  /** Focus-specific list: customers, registrations or resale listings. */
  rows: AnyRow[];
};

const NONE: AnyRow[] = [];

function asList(p: Promise<unknown>): Promise<AnyRow[]> {
  return p.then((r) => (Array.isArray(r) ? (r as AnyRow[]) : NONE));
}

/** Supporting lists (lookups, optional drill-down) must not take the whole report down. */
function optional(p: Promise<unknown>): Promise<AnyRow[]> {
  return asList(p).catch(() => NONE);
}

async function loadReport(focus: ReportFocus): Promise<ReportData> {
  const base: ReportData = { summary: {}, bookings: NONE, projects: NONE, payments: NONE, agents: NONE, plots: NONE, rows: NONE };
  const summary = api.reports.summary() as Promise<AnyRow>;
  switch (focus) {
    case 'sales': {
      const [s, bookings, projects] = await Promise.all([summary, asList(api.bookings.list()), optional(api.projects.list())]);
      return { ...base, summary: s, bookings, projects };
    }
    case 'inventory': {
      const [s, projects] = await Promise.all([summary, optional(api.projects.list())]);
      const perProject = await Promise.all(projects.map((p) => optional(api.plots.listByProject(String(p.id)))));
      return { ...base, summary: s, projects, plots: perProject.flat() };
    }
    case 'collections': {
      const [s, payments, bookings, projects] = await Promise.all([
        summary,
        asList(api.payments.list()),
        optional(api.bookings.list()),
        optional(api.projects.list()),
      ]);
      return { ...base, summary: s, payments, bookings, projects };
    }
    case 'agents': {
      const [s, agents, bookings] = await Promise.all([summary, asList(api.agents.list()), asList(api.bookings.list())]);
      return { ...base, summary: s, agents, bookings };
    }
    case 'customers': {
      const [s, rows, bookings] = await Promise.all([summary, asList(api.customers.list()), optional(api.bookings.list())]);
      return { ...base, summary: s, rows, bookings };
    }
    case 'registrations': {
      const [s, rows] = await Promise.all([summary, asList(api.registrations.list())]);
      return { ...base, summary: s, rows };
    }
    case 'resale': {
      const [s, rows, projects] = await Promise.all([summary, asList(api.resales.list()), optional(api.projects.list())]);
      return { ...base, summary: s, rows, projects };
    }
  }
}

/* --------------------------------- helpers -------------------------------- */

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const PAISE_PER_CRORE = 1e9;
const PAISE_PER_LAKH = 1e7;

/** `₹1.24 Cr`, `₹45.0 L`, or plain rupees below a lakh. */
function compactPaise(paise: unknown): string {
  if (paise === null || paise === undefined || paise === '') return DASH;
  const n = Number(paise);
  if (!Number.isFinite(n)) return DASH;
  if (Math.abs(n) >= PAISE_PER_CRORE) return `₹${(n / PAISE_PER_CRORE).toFixed(2)} Cr`;
  if (Math.abs(n) >= PAISE_PER_LAKH) return `₹${(n / PAISE_PER_LAKH).toFixed(1)} L`;
  return formatPaise(n);
}

/** Chart unit for a money axis: crores once any bucket reaches ₹1 Cr, else lakhs. */
function moneyUnit(maxPaise: number): { label: string; divisor: number } {
  return maxPaise >= PAISE_PER_CRORE ? { label: '₹ Cr', divisor: PAISE_PER_CRORE } : { label: '₹ L', divisor: PAISE_PER_LAKH };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumPaise(rows: AnyRow[], key: string): number {
  return rows.reduce((a, r) => a + num(r[key]), 0);
}

function monthKey(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

type MonthBucket = { key: string; month: string; count: number; paise: number };

/**
 * Contiguous monthly buckets ending at the current month (or the latest record, if later),
 * starting at the earliest record but never more than `maxMonths` back.
 */
function monthlySeries(rows: AnyRow[], dateOf: (r: AnyRow) => unknown, paiseOf: (r: AnyRow) => number, maxMonths: number): MonthBucket[] {
  const buckets = new Map<string, { count: number; paise: number }>();
  for (const r of rows) {
    const k = monthKey(dateOf(r));
    if (!k) continue;
    const b = buckets.get(k) ?? { count: 0, paise: 0 };
    b.count += 1;
    b.paise += paiseOf(r);
    buckets.set(k, b);
  }
  if (buckets.size === 0) return [];
  const keys = [...buckets.keys()].sort();
  const now = monthKey(new Date())!;
  const last = keys[keys.length - 1] > now ? keys[keys.length - 1] : now;
  const [ly, lm] = last.split('-').map(Number);
  const [fy, fm] = keys[0].split('-').map(Number);
  const span = Math.min(maxMonths, (ly - fy) * 12 + (lm - fm) + 1);
  const out: MonthBucket[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(ly, lm - 1 - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.get(k) ?? { count: 0, paise: 0 };
    out.push({ key: k, month: monthLabel(k), ...b });
  }
  return out;
}

function groupBy(rows: AnyRow[], key: (r: AnyRow) => unknown): { key: string; count: number; rows: AnyRow[] }[] {
  const map = new Map<string, AnyRow[]>();
  for (const r of rows) {
    const k = String(key(r) ?? '') || 'Unspecified';
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return Array.from(map, ([k, list]) => ({ key: k, count: list.length, rows: list })).sort((a, b) => b.count - a.count);
}

function bookingDate(b: AnyRow): unknown {
  return b.bookedAt ?? b.createdAt;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function useProjectCodes(projects: AnyRow[]) {
  return useMemo(() => new Map(projects.map((p) => [String(p.id), String(p.code || p.name || shortId(p.id))])), [projects]);
}

/* ---------------------------------- chrome --------------------------------- */

const TOOLTIP_STYLE = {
  background: 'var(--surface-highest)',
  border: 'none',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--foreground)',
};
const AXIS_TICK = { fontSize: 11 };
const AXIS_STROKE = 'var(--outline-variant)';

function ChartBox({ empty, children }: { empty: boolean; children: ReactElement }) {
  return (
    <div className="h-64">
      {empty ? (
        <EmptyState compact title="No data yet" description="The chart fills in as records are created." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-surface-lowest text-foreground shadow-ambient' : 'text-muted-foreground hover:bg-surface-c',
      )}
    >
      {children}
    </button>
  );
}

const PERIODS = [
  { months: 3, label: 'Last 3 months' },
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last 12 months' },
];

function FilterRow({
  months,
  onMonths,
  projects,
  projectId,
  onProject,
}: {
  months: number;
  onMonths: (m: number) => void;
  projects: AnyRow[];
  projectId: string;
  onProject: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-6 pb-2">
      {PERIODS.map((p) => (
        <Pill key={p.months} active={p.months === months} onClick={() => onMonths(p.months)}>
          {p.label}
        </Pill>
      ))}
      <div className="flex-1" />
      {projects.length > 1 &&
        [{ id: 'All', code: 'All projects' }, ...projects].map((p) => (
          <Pill key={String(p.id)} active={String(p.id) === projectId} onClick={() => onProject(String(p.id))}>
            {String(p.code || p.name || shortId(p.id))}
          </Pill>
        ))}
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <Metric key={m.label} accent={i === 0} label={m.label} value={m.value} hint={m.hint} />
      ))}
    </div>
  );
}

type BreakdownRow = { key: string; label: ReactNode; count: number; color?: string; detail?: string };

function BreakdownPanel({ title, aside, rows, className }: { title: string; aside?: string; rows: BreakdownRow[]; className?: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <Panel className={className}>
      <SectionTitle aside={aside ?? `${total} total`}>{title}</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState compact title="No data yet" description="Records will appear here as they are created." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = total ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0 truncate">{r.label}</div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-c">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pct}%`, ...(r.color ? { background: r.color } : {}) }}
                  />
                </div>
                <span className="numeric min-w-16 text-right text-xs whitespace-nowrap text-muted-foreground">
                  {r.detail ?? r.count} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

type StatusCount = { status: CanonicalPlotStatus; count: number };

function inventoryCounts(summary: AnyRow): StatusCount[] {
  const map = new Map<CanonicalPlotStatus, number>();
  for (const r of (summary.inventoryByStatus as AnyRow[]) || []) {
    const s = plotStatusColors(r.status).status;
    map.set(s, (map.get(s) ?? 0) + num(r.count));
  }
  return PLOT_STATUSES.filter((s) => map.has(s)).map((s) => ({ status: s, count: map.get(s) ?? 0 }));
}

function countOf(inv: StatusCount[], statuses: CanonicalPlotStatus[]): number {
  return inv.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + r.count, 0);
}

function InventoryBreakdown({ inv, className }: { inv: StatusCount[]; className?: string }) {
  const total = inv.reduce((a, r) => a + r.count, 0);
  return (
    <BreakdownPanel
      className={className}
      title="Inventory by status"
      aside={`${total} plots`}
      rows={inv.map((r) => ({
        key: r.status,
        label: <PlotStatusChip status={r.status} />,
        count: r.count,
        color: plotStatusColors(r.status).solid,
      }))}
    />
  );
}

function Money({ paise }: { paise: unknown }) {
  return <span className="numeric text-sm font-medium">{compactPaise(paise)}</span>;
}

/* ---------------------------------- sales ---------------------------------- */

function SalesReport({ data }: { data: ReportData }) {
  const [months, setMonths] = useState(6);
  const [projectId, setProjectId] = useState('All');
  const codes = useProjectCodes(data.projects);

  const scoped = useMemo(
    () => (projectId === 'All' ? data.bookings : data.bookings.filter((b) => String(b.projectId) === projectId)),
    [data.bookings, projectId],
  );

  const totalValue = sumPaise(scoped, 'agreementValuePaise');
  const registered = scoped.filter((b) => b.plot?.status === 'REGISTERED' || b.state === 'COMPLETED').length;
  const active = scoped.filter((b) => b.state === 'ACTIVE').length;

  const trend = useMemo(
    () => monthlySeries(scoped, bookingDate, (b) => num(b.agreementValuePaise), months),
    [scoped, months],
  );

  const byProject = useMemo(() => {
    const totals = new Map<string, number>();
    for (const b of data.bookings) totals.set(String(b.projectId), (totals.get(String(b.projectId)) ?? 0) + num(b.agreementValuePaise));
    const ids = data.projects.length ? data.projects.map((p) => String(p.id)) : [...totals.keys()];
    const rows = ids.map((id) => ({ id, name: codes.get(id) ?? shortId(id), paise: totals.get(id) ?? 0 }));
    const unit = moneyUnit(Math.max(0, ...rows.map((r) => r.paise)));
    return { unit, rows: rows.sort((a, b) => b.paise - a.paise).map((r) => ({ ...r, value: round2(r.paise / unit.divisor) })) };
  }, [data.bookings, data.projects, codes]);

  const recent = useMemo(() => withIds(scoped.slice(0, 20)), [scoped]);

  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Total bookings', value: scoped.length, hint: projectId === 'All' ? 'all time' : codes.get(projectId) },
          { label: 'Booking value', value: compactPaise(totalValue), hint: 'Agreement value' },
          { label: 'Registered / Active', value: `${registered} / ${active}`, hint: `of ${scoped.length} bookings` },
          { label: 'Avg ticket size', value: scoped.length ? compactPaise(totalValue / scoped.length) : DASH },
        ]}
      />

      <FilterRow months={months} onMonths={setMonths} projects={data.projects} projectId={projectId} onProject={setProjectId} />

      <div className="grid gap-4 pt-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside="bookings / month">Bookings trend</SectionTitle>
          <ChartBox empty={trend.length === 0}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={AXIS_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v, _n, item) => [`${v} · ${compactPaise((item?.payload as MonthBucket | undefined)?.paise)}`, 'Bookings']}
              />
              <Area type="monotone" dataKey="count" name="Bookings" stroke="var(--primary)" fill="url(#bookingsFill)" strokeWidth={2} />
            </AreaChart>
          </ChartBox>
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle aside={byProject.unit.label}>Sales by project</SectionTitle>
          <ChartBox empty={byProject.rows.every((r) => r.paise === 0)}>
            <BarChart data={byProject.rows}>
              <CartesianGrid vertical={false} stroke={AXIS_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'var(--surface-low)' }}
                formatter={(_v, _n, item) => [compactPaise((item?.payload as { paise?: number } | undefined)?.paise), 'Booking value']}
              />
              <Bar dataKey="value" fill="var(--secondary)" radius={[6, 6, 0, 0]}>
                {byProject.rows.map((r) => (
                  <Cell key={r.id} fillOpacity={projectId === 'All' || projectId === r.id ? 1 : 0.35} />
                ))}
              </Bar>
            </BarChart>
          </ChartBox>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle aside={<LinkBtn to="/bookings">All bookings</LinkBtn>}>Recent bookings</SectionTitle>
        <DataTable
          rows={recent}
          linkTo={(b) => `/bookings/${b.id}`}
          emptyMessage="No bookings recorded yet."
          columns={[
            { key: 'id', header: 'Booking', cell: (b) => <Mono className="font-medium">{shortId(b.id)}</Mono> },
            { key: 'customer', header: 'Customer', cell: (b) => <span className="text-sm">{display(b.customer?.name)}</span> },
            { key: 'project', header: 'Project', cell: (b) => <Muted className="text-sm">{codes.get(String(b.projectId)) ?? DASH}</Muted> },
            { key: 'plot', header: 'Plot', cell: (b) => <span className="numeric text-sm">{display(b.plot?.number)}</span> },
            { key: 'agent', header: 'Agent', cell: (b) => <Muted className="text-sm">{b.agent?.name || 'Direct'}</Muted> },
            { key: 'state', header: 'Stage', cell: (b) => <StatusChip value={b.state} /> },
            { key: 'date', header: 'Booked', cell: (b) => <Muted className="numeric">{formatDate(bookingDate(b))}</Muted> },
            { key: 'value', header: 'Value', align: 'right', cell: (b) => <Money paise={b.agreementValuePaise} /> },
          ]}
        />
      </div>
    </>
  );
}

/* -------------------------------- inventory -------------------------------- */

function InventoryReport({ data }: { data: ReportData }) {
  const [selected, setSelected] = useState<CanonicalPlotStatus | 'all'>('all');
  const codes = useProjectCodes(data.projects);
  const inv = useMemo(() => inventoryCounts(data.summary), [data.summary]);
  const total = inv.reduce((a, r) => a + r.count, 0);

  const pie = inv.filter((r) => r.count > 0).map((r) => ({ ...r, name: plotStatusLabel(r.status) }));

  const stacked = useMemo(() => {
    const present = new Set<CanonicalPlotStatus>();
    const byProject = new Map<string, Record<string, number | string>>();
    for (const p of data.plots) {
      const pid = String(p.projectId);
      const s = plotStatusColors(p.status).status;
      present.add(s);
      const row = byProject.get(pid) ?? { name: codes.get(pid) ?? shortId(pid) };
      row[s] = num(row[s]) + 1;
      byProject.set(pid, row);
    }
    return { statuses: PLOT_STATUSES.filter((s) => present.has(s)), rows: [...byProject.values()] };
  }, [data.plots, codes]);

  const detail = useMemo(
    () =>
      withIds(
        (selected === 'all' ? data.plots : data.plots.filter((p) => plotStatusColors(p.status).status === selected)).slice(0, 50),
      ),
    [data.plots, selected],
  );

  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Total plots', value: total },
          { label: 'Available', value: countOf(inv, ['AVAILABLE', 'RESALE_AVAILABLE']) },
          { label: 'Reserved / Booked', value: `${countOf(inv, ['RESERVED'])} / ${countOf(inv, ['BOOKED'])}` },
          { label: 'Sold / Registered', value: `${countOf(inv, ['SOLD'])} / ${countOf(inv, ['REGISTERED'])}` },
        ]}
      />

      <div className="grid gap-4 pt-6 lg:grid-cols-5">
        <Panel className="lg:col-span-2">
          <SectionTitle aside={`${total} plots`}>Status mix</SectionTitle>
          <ChartBox empty={pie.length === 0}>
            <PieChart>
              <Pie data={pie} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {pie.map((c) => (
                  <Cell key={c.status} fill={plotStatusColors(c.status).solid} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartBox>
        </Panel>
        <Panel className="lg:col-span-3">
          <SectionTitle aside={`${stacked.rows.length} projects`}>Stock mix by project</SectionTitle>
          <ChartBox empty={stacked.rows.length === 0}>
            <BarChart data={stacked.rows}>
              <CartesianGrid vertical={false} stroke={AXIS_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--surface-low)' }} />
              {stacked.statuses.map((s) => (
                <Bar key={s} dataKey={s} name={plotStatusLabel(s)} stackId="inv" fill={plotStatusColors(s).solid} />
              ))}
            </BarChart>
          </ChartBox>
        </Panel>
      </div>

      <div className="pt-4">
        <InventoryBreakdown inv={inv} />
      </div>

      {data.plots.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 pt-6 pb-2">
            <Pill active={selected === 'all'} onClick={() => setSelected('all')}>
              All statuses
            </Pill>
            {inv.map((r) => (
              <Pill key={r.status} active={selected === r.status} onClick={() => setSelected(r.status)}>
                {plotStatusLabel(r.status)} · {r.count}
              </Pill>
            ))}
          </div>
          <SectionTitle aside={detail.length === 50 ? 'first 50' : `${detail.length} plots`}>Plot detail</SectionTitle>
          <DataTable
            rows={detail}
            linkTo={(p) => `/projects/${p.projectId}/plots`}
            emptyMessage="No plots in this status."
            columns={[
              { key: 'number', header: 'Plot', cell: (p) => <span className="numeric text-sm font-medium">{display(p.number)}</span> },
              { key: 'project', header: 'Project', cell: (p) => <Muted className="text-sm">{codes.get(String(p.projectId)) ?? DASH}</Muted> },
              { key: 'area', header: 'Area', align: 'right', cell: (p) => <span className="numeric text-sm">{p.areaSqYd ? `${p.areaSqYd} sq.yd` : DASH}</span> },
              { key: 'facing', header: 'Facing', cell: (p) => <Muted className="text-sm">{display(p.facing)}</Muted> },
              { key: 'status', header: 'Status', cell: (p) => <PlotStatusChip status={p.status} /> },
              { key: 'price', header: 'Price', align: 'right', cell: (p) => <span className="numeric text-sm font-medium">{formatRupees(p.totalPrice)}</span> },
            ]}
          />
        </>
      )}
    </>
  );
}

/* ------------------------------- collections ------------------------------- */

function CollectionsReport({ data }: { data: ReportData }) {
  const [months, setMonths] = useState(6);
  const [projectId, setProjectId] = useState('All');
  const codes = useProjectCodes(data.projects);
  const customerByBooking = useMemo(
    () => new Map(data.bookings.map((b) => [String(b.id), b.customer?.name as string | undefined])),
    [data.bookings],
  );

  const scoped = useMemo(
    () => (projectId === 'All' ? data.payments : data.payments.filter((p) => String(p.projectId) === projectId)),
    [data.payments, projectId],
  );
  const valid = useMemo(() => scoped.filter((p) => !p.voidedAt), [scoped]);
  const voided = scoped.length - valid.length;
  const collected = projectId === 'All' ? num((data.summary.collections as AnyRow)?.amountPaise) : sumPaise(valid, 'amountPaise');

  const trend = useMemo(() => {
    const series = monthlySeries(valid, (p) => p.paidAt, (p) => num(p.amountPaise), months);
    const unit = moneyUnit(Math.max(0, ...series.map((s) => s.paise)));
    return { unit, rows: series.map((s) => ({ ...s, collected: round2(s.paise / unit.divisor) })) };
  }, [valid, months]);

  const periodPaise = trend.rows.reduce((a, r) => a + r.paise, 0);

  const methods: BreakdownRow[] = groupBy(valid, (p) => p.method).map((g) => ({
    key: g.key,
    label: <Chip>{humanize(g.key)}</Chip>,
    count: g.count,
    detail: `${g.count} · ${compactPaise(sumPaise(g.rows, 'amountPaise'))}`,
  }));

  const recent = useMemo(() => withIds(scoped.slice(0, 20)), [scoped]);

  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Collected', value: compactPaise(collected), hint: 'Non-voided payments' },
          { label: 'Payments', value: valid.length, hint: voided ? `${voided} voided, excluded` : undefined },
          { label: `Collected (${months}mo)`, value: compactPaise(periodPaise) },
          { label: 'Avg. payment', value: valid.length ? compactPaise(sumPaise(valid, 'amountPaise') / valid.length) : DASH },
        ]}
      />

      <FilterRow months={months} onMonths={setMonths} projects={data.projects} projectId={projectId} onProject={setProjectId} />

      <div className="grid gap-4 pt-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside={`${trend.unit.label} collected · payment count`}>Cashflow trend</SectionTitle>
          <ChartBox empty={trend.rows.length === 0}>
            <ComposedChart data={trend.rows}>
              <CartesianGrid vertical={false} stroke={AXIS_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis yAxisId="amt" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis yAxisId="cnt" orientation="right" tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'var(--surface-low)' }}
                formatter={(v, name, item) =>
                  name === 'Collected' ? [compactPaise((item?.payload as MonthBucket | undefined)?.paise), name] : [v, name]
                }
              />
              <Bar yAxisId="amt" dataKey="collected" name="Collected" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={22} />
              <Line yAxisId="cnt" type="monotone" dataKey="count" name="Payments" stroke="var(--secondary)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ChartBox>
        </Panel>
        <BreakdownPanel className="lg:col-span-2" title="Payments by method" aside={`${valid.length} payments`} rows={methods} />
      </div>

      <div className="pt-6">
        <SectionTitle aside={<LinkBtn to="/payments">All payments</LinkBtn>}>Recent payments</SectionTitle>
        <DataTable
          rows={recent}
          linkTo={(p) => `/payments/${p.id}`}
          emptyMessage="No payments recorded yet."
          columns={[
            { key: 'id', header: 'Payment', cell: (p) => <Mono className="font-medium">{p.receiptNumber || shortId(p.id)}</Mono> },
            { key: 'customer', header: 'Customer', cell: (p) => <span className="text-sm">{customerByBooking.get(String(p.bookingId)) ?? DASH}</span> },
            { key: 'project', header: 'Project', cell: (p) => <Muted className="text-sm">{codes.get(String(p.projectId)) ?? DASH}</Muted> },
            { key: 'method', header: 'Mode', cell: (p) => <Chip tone="neutral">{humanize(p.method)}</Chip> },
            { key: 'ref', header: 'Reference', cell: (p) => <Mono className="text-muted-foreground">{display(p.txnRef)}</Mono> },
            { key: 'status', header: 'Status', cell: (p) => <StatusChip value={p.voidedAt ? 'VOIDED' : p.reconciliationStatus} /> },
            { key: 'paidAt', header: 'Paid', cell: (p) => <Muted className="numeric">{formatDate(p.paidAt)}</Muted> },
            { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <Money paise={p.amountPaise} /> },
          ]}
        />
      </div>
    </>
  );
}

/* --------------------------------- agents ---------------------------------- */

type AgentStat = { agent: AnyRow; bookings: AnyRow[]; paise: number };

function AgentsReport({ data }: { data: ReportData }) {
  const live = useMemo(() => data.bookings.filter((b) => b.state !== 'CANCELLED'), [data.bookings]);

  const ranked: AgentStat[] = useMemo(() => {
    const byAgent = groupBy(
      live.filter((b) => b.agentId),
      (b) => b.agentId,
    );
    const lookup = new Map(byAgent.map((g) => [g.key, g.rows]));
    return data.agents
      .map((a) => {
        const rows = lookup.get(String(a.id)) ?? [];
        return { agent: a, bookings: rows, paise: sumPaise(rows, 'agreementValuePaise') };
      })
      .sort((x, y) => y.paise - x.paise || y.bookings.length - x.bookings.length);
  }, [data.agents, live]);

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = ranked.find((r) => String(r.agent.id) === selectedId) ?? ranked[0];

  const agentValue = ranked.reduce((a, r) => a + r.paise, 0);
  const direct = live.filter((b) => !b.agentId).length;
  const activeAgents = data.agents.filter((a) => String(a.status ?? '').toLowerCase() === 'active').length;
  const maxPaise = Math.max(1, ...ranked.map((r) => r.paise));
  const top = ranked[0] && ranked[0].bookings.length > 0 ? ranked[0] : undefined;

  const trend = useMemo(() => {
    const series = monthlySeries(selected?.bookings ?? [], bookingDate, (b) => num(b.agreementValuePaise), 12);
    const unit = moneyUnit(Math.max(0, ...series.map((s) => s.paise)));
    return { unit, rows: series.map((s) => ({ ...s, value: round2(s.paise / unit.divisor) })) };
  }, [selected]);

  const agentBookings = useMemo(() => withIds((selected?.bookings ?? []).slice(0, 15)), [selected]);

  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Active agents', value: activeAgents, hint: `of ${data.agents.length}` },
          { label: 'Agent-sourced value', value: compactPaise(agentValue), hint: 'excl. cancelled' },
          { label: 'Direct bookings', value: direct, hint: 'no agent attached' },
          { label: 'Top performer', value: top ? String(top.agent.name) : DASH, hint: top ? compactPaise(top.paise) : undefined },
        ]}
      />

      <div className="grid gap-4 pt-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle aside="bookings · value">Leaderboard</SectionTitle>
          {ranked.length === 0 ? (
            <EmptyState compact title="No agents yet" description="Provision agents from Members to see them ranked here." />
          ) : (
            <div className="space-y-1">
              {ranked.map((r, i) => {
                const id = String(r.agent.id);
                const isSel = selected && String(selected.agent.id) === id;
                const share = agentValue ? Math.round((r.paise / agentValue) * 100) : 0;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    aria-pressed={Boolean(isSel)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                      isSel ? 'bg-surface-low' : 'hover:bg-surface-low/60',
                    )}
                  >
                    <span className="numeric w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
                      {initials(String(r.agent.name ?? ''))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {display(r.agent.name)} <Muted>{r.agent.code || r.agent.region || ''}</Muted>
                        </p>
                        <span className="numeric text-xs text-muted-foreground">{compactPaise(r.paise)}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-c">
                        <div className="gradient-primary h-full rounded-full" style={{ width: `${(r.paise / maxPaise) * 100}%` }} />
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right">
                      <p className="numeric text-xs font-medium">{r.bookings.length} bookings</p>
                      <p className="numeric text-[11px] text-muted-foreground">{share}% of value</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel className="lg:col-span-2">
          <SectionTitle aside={selected ? `${display(selected.agent.name)} · ${trend.unit.label}` : DASH}>Sales trend</SectionTitle>
          <ChartBox empty={trend.rows.length === 0}>
            <LineChart data={trend.rows}>
              <CartesianGrid vertical={false} stroke={AXIS_STROKE} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(_v, _n, item) => {
                  const b = item?.payload as MonthBucket | undefined;
                  return [`${compactPaise(b?.paise)} · ${b?.count ?? 0} bookings`, 'Value'];
                }}
              />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ChartBox>
        </Panel>
      </div>

      <div className="pt-6">
        <SectionTitle
          aside={selected ? <LinkBtn to={`/agents/${selected.agent.id}`}>Agent profile</LinkBtn> : `${agentBookings.length} bookings`}
        >
          {selected ? `${display(selected.agent.name)} · Bookings` : 'Agent bookings'}
        </SectionTitle>
        <DataTable
          rows={agentBookings}
          linkTo={(b) => `/bookings/${b.id}`}
          emptyMessage="No bookings attributed to this agent yet."
          columns={[
            { key: 'id', header: 'Booking', cell: (b) => <Mono className="font-medium">{shortId(b.id)}</Mono> },
            { key: 'customer', header: 'Customer', cell: (b) => <span className="text-sm">{display(b.customer?.name)}</span> },
            { key: 'plot', header: 'Plot', cell: (b) => <span className="numeric text-sm">{display(b.plot?.number)}</span> },
            { key: 'state', header: 'Stage', cell: (b) => <StatusChip value={b.state} /> },
            { key: 'date', header: 'Date', cell: (b) => <Muted className="numeric">{formatDate(bookingDate(b))}</Muted> },
            { key: 'value', header: 'Value', align: 'right', cell: (b) => <Money paise={b.agreementValuePaise} /> },
          ]}
        />
      </div>
    </>
  );
}

/* ------------------------ customers / registrations / resale ------------------------ */

function CustomersReport({ data }: { data: ReportData }) {
  const s = data.summary;
  const inv = useMemo(() => inventoryCounts(s), [s]);
  const byCustomer = useMemo(() => {
    const map = new Map<string, { count: number; paise: number }>();
    for (const b of data.bookings) {
      if (b.state === 'CANCELLED') continue;
      const k = String(b.customerId);
      const cur = map.get(k) ?? { count: 0, paise: 0 };
      cur.count += 1;
      cur.paise += num(b.agreementValuePaise);
      map.set(k, cur);
    }
    return map;
  }, [data.bookings]);

  const rows = useMemo(
    () =>
      withIds(
        [...data.rows]
          .sort((a, b) => (byCustomer.get(String(b.id))?.paise ?? 0) - (byCustomer.get(String(a.id))?.paise ?? 0))
          .slice(0, 25),
      ),
    [data.rows, byCustomer],
  );

  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Customers', value: display(s.customers) },
          { label: 'Leads', value: display(s.leads) },
          { label: 'Bookings', value: display(s.bookings) },
          {
            label: 'Booking conversion',
            value: num(s.customers) ? `${Math.round((byCustomer.size / num(s.customers)) * 100)}%` : DASH,
            hint: 'Customers with a live booking',
          },
        ]}
      />
      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <BreakdownPanel
          title="Customers by city"
          rows={groupBy(data.rows, (c) => c.city)
            .slice(0, 10)
            .map((g) => ({ key: g.key, label: <span className="text-sm">{g.key}</span>, count: g.count }))}
        />
        <BreakdownPanel
          title="KYC status"
          rows={groupBy(data.rows, (c) => c.kycStatus).map((g) => ({ key: g.key, label: <Chip>{humanize(g.key)}</Chip>, count: g.count }))}
        />
      </div>
      <div className="pt-6">
        <SectionTitle aside={<LinkBtn to="/customers">All customers</LinkBtn>}>Top customers by booking value</SectionTitle>
        <DataTable
          rows={rows}
          linkTo={(c) => `/customers/${c.id}`}
          emptyMessage="No customers yet."
          columns={[
            { key: 'name', header: 'Customer', cell: (c) => <span className="text-sm font-medium">{display(c.name)}</span> },
            { key: 'city', header: 'City', cell: (c) => <Muted className="text-sm">{display(c.city)}</Muted> },
            { key: 'kyc', header: 'KYC', cell: (c) => <StatusChip value={c.kycStatus} /> },
            { key: 'bookings', header: 'Bookings', align: 'right', cell: (c) => <span className="numeric text-sm">{byCustomer.get(String(c.id))?.count ?? 0}</span> },
            { key: 'value', header: 'Booking value', align: 'right', cell: (c) => <Money paise={byCustomer.get(String(c.id))?.paise ?? 0} /> },
            { key: 'createdAt', header: 'Since', cell: (c) => <Muted className="numeric">{formatDate(c.createdAt)}</Muted> },
          ]}
        />
      </div>
      <div className="pt-6">
        <InventoryBreakdown inv={inv} />
      </div>
    </>
  );
}

function RegistrationsReport({ data }: { data: ReportData }) {
  const inv = useMemo(() => inventoryCounts(data.summary), [data.summary]);
  const rows = useMemo(() => withIds(data.rows.slice(0, 25)), [data.rows]);
  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Registrations', value: data.rows.length },
          { label: 'Registered plots', value: countOf(inv, ['REGISTERED']) },
          { label: 'Sold (awaiting deed)', value: countOf(inv, ['SOLD']) },
          { label: 'Under documentation', value: countOf(inv, ['UNDER_DOCUMENTATION']) },
        ]}
      />
      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <BreakdownPanel
          title="Registrations by status"
          rows={groupBy(data.rows, (r) => r.status).map((g) => ({ key: g.key, label: <Chip>{humanize(g.key)}</Chip>, count: g.count }))}
        />
        <InventoryBreakdown inv={inv} />
      </div>
      <div className="pt-6">
        <SectionTitle aside={<LinkBtn to="/registrations">All registrations</LinkBtn>}>Recent registrations</SectionTitle>
        <DataTable
          rows={rows}
          linkTo={(r) => (r.bookingId ? `/bookings/${r.bookingId}` : null)}
          emptyMessage="No registrations started yet."
          columns={[
            { key: 'customer', header: 'Customer', cell: (r) => <span className="text-sm font-medium">{display(r.customer?.name)}</span> },
            { key: 'booking', header: 'Booking', cell: (r) => <Mono>{shortId(r.bookingId)}</Mono> },
            { key: 'status', header: 'Status', cell: (r) => <StatusChip value={r.status} /> },
            { key: 'deed', header: 'Deed no.', cell: (r) => <Mono>{display(r.deedNumber)}</Mono> },
            { key: 'registeredAt', header: 'Registered', cell: (r) => <Muted className="numeric">{formatDate(r.registeredAt)}</Muted> },
            { key: 'updatedAt', header: 'Updated', cell: (r) => <Muted className="numeric">{formatDate(r.updatedAt)}</Muted> },
          ]}
        />
      </div>
    </>
  );
}

function ResaleReport({ data }: { data: ReportData }) {
  const inv = useMemo(() => inventoryCounts(data.summary), [data.summary]);
  const codes = useProjectCodes(data.projects);
  const rows = useMemo(() => withIds(data.rows.slice(0, 25)), [data.rows]);
  const listedValue = sumPaise(
    data.rows.filter((r) => r.status === 'LISTED' || r.status === 'UNDER_OFFER'),
    'askingPricePaise',
  );
  return (
    <>
      <MetricGrid
        metrics={[
          { label: 'Resale listings', value: data.rows.length },
          { label: 'Resale-available plots', value: countOf(inv, ['RESALE_AVAILABLE']) },
          { label: 'Listed asking value', value: compactPaise(listedValue), hint: 'Listed + under offer' },
          { label: 'Projects', value: display(data.summary.projects) },
        ]}
      />
      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <BreakdownPanel
          title="Resale listings by status"
          rows={groupBy(data.rows, (r) => r.status).map((g) => ({ key: g.key, label: <Chip>{humanize(g.key)}</Chip>, count: g.count }))}
        />
        <InventoryBreakdown inv={inv} />
      </div>
      <div className="pt-6">
        <SectionTitle aside={<LinkBtn to="/resale">All listings</LinkBtn>}>Resale listings</SectionTitle>
        <DataTable
          rows={rows}
          emptyMessage="No resale listings yet."
          columns={[
            { key: 'plot', header: 'Plot', cell: (r) => <span className="numeric text-sm font-medium">{display(r.plot?.number)}</span> },
            { key: 'project', header: 'Project', cell: (r) => <Muted className="text-sm">{codes.get(String(r.projectId)) ?? DASH}</Muted> },
            { key: 'customer', header: 'Owner', cell: (r) => <span className="text-sm">{display(r.customer?.name)}</span> },
            { key: 'status', header: 'Status', cell: (r) => <StatusChip value={r.status} /> },
            { key: 'listedAt', header: 'Listed', cell: (r) => <Muted className="numeric">{formatDate(r.listedAt)}</Muted> },
            { key: 'ask', header: 'Asking', align: 'right', cell: (r) => <Money paise={r.askingPricePaise} /> },
          ]}
        />
      </div>
    </>
  );
}

/* ---------------------------------- page ----------------------------------- */

export function ReportsPage({ focus }: { focus: ReportFocus }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    loadReport(focus)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(errMsg(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [focus, nonce]);

  const meta = TITLES[focus];

  let body: ReactNode = null;
  if (data) {
    switch (focus) {
      case 'sales':
        body = <SalesReport data={data} />;
        break;
      case 'inventory':
        body = <InventoryReport data={data} />;
        break;
      case 'collections':
        body = <CollectionsReport data={data} />;
        break;
      case 'agents':
        body = <AgentsReport data={data} />;
        break;
      case 'customers':
        body = <CustomersReport data={data} />;
        break;
      case 'registrations':
        body = <RegistrationsReport data={data} />;
        break;
      case 'resale':
        body = <ResaleReport data={data} />;
        break;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title={meta.title}
        description={meta.description}
        actions={focus === 'inventory' ? <LinkBtn to="/plots" variant="tonal">Live inventory</LinkBtn> : undefined}
      />
      {err ? (
        <ErrorState title="Couldn't load report" error={err} onRetry={() => setNonce((n) => n + 1)} />
      ) : loading || !data ? (
        <LoadingState variant="metrics" rows={4} />
      ) : (
        body
      )}
    </>
  );
}
