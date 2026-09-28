import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarCheck2,
  Clock3,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
  NewRecordButton,
  PageHeader,
  Panel,
  SectionTitle,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Mono, Muted, StatusChip } from '../components/common';
import { display, errMsg, formatDateTime, formatPaise, humanize, type AnyRow } from '../lib/data';

const chartAxis = {
  stroke: 'var(--outline-variant)',
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--muted-foreground)', fontSize: 11 },
};

const quickActions: { label: string; to: string; icon: LucideIcon; badge?: 'clock' }[] = [
  { label: "Today's Visits", to: '/visits', icon: CalendarCheck2 },
  { label: 'Follow-ups', to: '/notifications', icon: UserRound, badge: 'clock' },
  { label: 'At Risk', to: '/reservations', icon: AlertTriangle },
  { label: 'Pending Payments', to: '/payments', icon: Banknote, badge: 'clock' },
];

function QuickActionTile({
  label,
  to,
  icon: Icon,
  badge,
  index,
}: {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: 'clock';
  index: number;
}) {
  return (
    <Link
      to={to}
      className="rise flex min-h-[88px] min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border border-outline-variant/40 bg-surface-lowest px-1.5 py-3 text-center transition-transform active:scale-[0.97]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="relative inline-flex">
        <Icon className="h-6 w-6 text-primary" strokeWidth={1.55} />
        {badge === 'clock' && (
          <Clock3
            className="absolute -right-1.5 -bottom-1 h-3 w-3 rounded-full bg-surface-lowest text-primary"
            strokeWidth={2.2}
          />
        )}
      </span>
      <span className="text-[10px] leading-tight font-medium text-foreground">{label}</span>
    </Link>
  );
}

function monthKey(iso: unknown): string | null {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short' });
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

type DashData = {
  summary: AnyRow;
  projects: AnyRow[];
  bookings: AnyRow[];
  payments: AnyRow[];
  visits: AnyRow[];
  reservations: AnyRow[];
  leads: AnyRow[];
  plots: AnyRow[];
};

const EMPTY: DashData = {
  summary: {},
  projects: [],
  bookings: [],
  payments: [],
  visits: [],
  reservations: [],
  leads: [],
  plots: [],
};

async function asList(p: Promise<unknown>): Promise<AnyRow[]> {
  try {
    const r = await p;
    return Array.isArray(r) ? (r as AnyRow[]) : [];
  } catch {
    return [];
  }
}

export function DashboardPage() {
  const [data, setData] = useState<DashData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr('');
    (async () => {
      try {
        const [summary, projects, bookings, payments, visits, reservations, leads] = await Promise.all([
          api.reports.summary().catch(() => ({})),
          asList(api.projects.list()),
          asList(api.bookings.list()),
          asList(api.payments.list()),
          asList(api.visits.list()),
          asList(api.reservations.list()),
          asList(api.leads.list()),
        ]);
        // Optional per-project plot counts for absorption — sample first few projects.
        const plotBatches = await Promise.all(
          projects.slice(0, 6).map((p) => asList(api.plots.listByProject(String(p.id)))),
        );
        const plots = plotBatches.flat();
        if (!cancelled) {
          setData({
            summary: (summary || {}) as AnyRow,
            projects,
            bookings,
            payments,
            visits,
            reservations,
            leads,
            plots,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const months = useMemo(() => lastNMonths(8), []);

  const cashflow = useMemo(() => {
    const by: Record<string, number> = {};
    for (const p of data.payments) {
      if (p.voidedAt || String(p.status || '').toUpperCase() === 'VOIDED') continue;
      const k = monthKey(p.paidAt || p.createdAt);
      if (!k) continue;
      by[k] = (by[k] || 0) + Number(p.amountPaise || 0) / 100;
    }
    return months.map((k) => ({
      month: monthLabel(k),
      collected: Math.round(by[k] || 0),
    }));
  }, [data.payments, months]);

  const salesTrend = useMemo(() => {
    const bookingsBy: Record<string, number> = {};
    const visitsBy: Record<string, number> = {};
    for (const b of data.bookings) {
      const k = monthKey(b.bookedAt || b.createdAt);
      if (k) bookingsBy[k] = (bookingsBy[k] || 0) + 1;
    }
    for (const v of data.visits) {
      const k = monthKey(v.scheduledAt || v.date || v.createdAt);
      if (k) visitsBy[k] = (visitsBy[k] || 0) + 1;
    }
    return months.map((k) => ({
      month: monthLabel(k),
      bookings: bookingsBy[k] || 0,
      siteVisits: visitsBy[k] || 0,
    }));
  }, [data.bookings, data.visits, months]);

  const inventory = useMemo(() => {
    const fromSummary = Array.isArray(data.summary.inventoryByStatus)
      ? (data.summary.inventoryByStatus as AnyRow[])
      : [];
    if (fromSummary.length) {
      const total = fromSummary.reduce((s, r) => s + Number(r.count || 0), 0);
      const available = fromSummary
        .filter((r) => String(r.status || '').toUpperCase() === 'AVAILABLE')
        .reduce((s, r) => s + Number(r.count || 0), 0);
      return { total, available };
    }
    const total = data.plots.length;
    const available = data.plots.filter((p) => String(p.status || '').toUpperCase() === 'AVAILABLE').length;
    return { total, available };
  }, [data.summary, data.plots]);

  const collectedPaise = useMemo(() => {
    const fromSummary = data.summary?.collections as AnyRow | undefined;
    if (fromSummary?.amountPaise != null) return String(fromSummary.amountPaise);
    return String(
      data.payments
        .filter((p) => !p.voidedAt && String(p.status || '').toUpperCase() !== 'VOIDED')
        .reduce((s, p) => s + Number(p.amountPaise || 0), 0),
    );
  }, [data.summary, data.payments]);

  const activeProjects = data.projects.filter((p) =>
    String(p.lifecycleStatus || p.status || '').toUpperCase() === 'ACTIVE',
  ).length;
  const bookingsCount = Number(data.summary.bookings ?? data.bookings.length);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayVisits = data.visits.filter((v) => String(v.scheduledAt || v.date || '').slice(0, 10) === todayIso).length;
  const atRisk = data.reservations.filter((r) => {
    const s = String(r.state || r.status || '').toUpperCase();
    return s === 'ACTIVE' || s === 'PENDING' || s === 'AT_RISK';
  }).slice(0, 5);
  const recentBookings = data.bookings.slice(0, 6);
  const recentLeads = data.leads.slice(0, 6);

  const absorption = useMemo(() => {
    return data.projects.slice(0, 4).map((p) => {
      const plots = data.plots.filter((pl) => String(pl.projectId) === String(p.id));
      const total = plots.length || Number(p._count?.plots || 0);
      const sold = plots.filter((pl) => {
        const s = String(pl.status || '').toUpperCase();
        return s === 'SOLD' || s === 'BOOKED' || s === 'REGISTERED';
      }).length;
      const pct = total ? Math.round((sold / total) * 100) : 0;
      return { id: p.id, name: String(p.name || 'Project'), pct, total, sold };
    });
  }, [data.projects, data.plots]);

  const availablePct = inventory.total ? Math.round((inventory.available / inventory.total) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live portfolio KPIs and momentum from the production API — no mock business data."
        actions={
          <>
            <NewRecordButton to="/projects?new=1">New project</NewRecordButton>
            <Link
              to="/layouts"
              className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Open live layout <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {err ? <ErrorState title="Dashboard load failed" error={err} /> : null}

      <section className="space-y-2.5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-foreground">Quick actions</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="numeric font-semibold text-foreground">{todayVisits}</span> visits today
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[430px]:grid-cols-4">
          {quickActions.map((action, i) => (
            <QuickActionTile key={action.label} {...action} index={i} />
          ))}
        </div>
      </section>

      {loading ? (
        <LoadingState variant="metrics" rows={4} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Metric
              accent
              size="lg"
              label="Collected"
              value={formatPaise(collectedPaise)}
              hint={`${Number(data.summary?.collections?.paymentCount ?? data.payments.length)} payments · ${activeProjects} active projects`}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            <Metric label="Bookings" value={bookingsCount} hint="All time (API)" />
            <Metric
              label="Plots available"
              value={`${inventory.available} / ${inventory.total || '—'}`}
              hint={inventory.total ? `${availablePct}% available` : 'No inventory yet'}
            />
            <Metric
              label="Pipeline"
              value={Number(data.summary.leads ?? data.leads.length)}
              hint={`${Number(data.summary.activeReservations ?? atRisk.length)} active holds`}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 pt-4 lg:grid-cols-12">
        <Panel className="min-w-0 lg:col-span-7">
          <SectionTitle aside="Last 8 months">Collections cashflow</SectionTitle>
          {loading ? (
            <LoadingState variant="rows" rows={3} />
          ) : cashflow.every((r) => !r.collected) ? (
            <EmptyState compact title="No payments yet" description="Recorded collections appear as a monthly cashflow chart." />
          ) : (
            <div className="h-64 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflow} margin={{ left: -20, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="collectedLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="month" {...chartAxis} />
                  <YAxis {...chartAxis} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-float)',
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="collected" stroke="var(--primary)" strokeWidth={2} fill="url(#collectedLive)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel className="min-w-0 lg:col-span-5" tonal>
          <SectionTitle aside="Bookings vs visits">Sales momentum</SectionTitle>
          {loading ? (
            <LoadingState variant="rows" rows={3} />
          ) : (
            <div className="h-64 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend} margin={{ left: -20, right: 4, top: 8 }}>
                  <CartesianGrid stroke="var(--outline-variant)" strokeOpacity={0.18} vertical={false} />
                  <XAxis dataKey="month" {...chartAxis} />
                  <YAxis {...chartAxis} width={36} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--surface-c)' }}
                    contentStyle={{
                      background: 'var(--surface-lowest)',
                      border: 'none',
                      borderRadius: 12,
                      boxShadow: 'var(--shadow-float)',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="siteVisits" fill="var(--surface-highest)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="bookings" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-12">
        <Panel className="min-w-0 lg:col-span-4">
          <SectionTitle
            aside={
              <Link to="/projects" className="inline-flex items-center gap-1 font-medium text-primary">
                All <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Project absorption
          </SectionTitle>
          {absorption.length === 0 ? (
            <EmptyState compact title="No projects" description="Create a project to track sell-through." />
          ) : (
            <div className="space-y-2">
              {absorption.map((p) => (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link to={`/projects/${p.id}`} className="truncate text-sm font-medium">
                      {p.name}
                    </Link>
                    <span className="numeric text-xs text-muted-foreground">{p.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-c">
                    <div className="gradient-primary h-full rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                  <Muted className="pt-1">
                    {p.sold}/{p.total || '—'} sold/booked
                  </Muted>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="min-w-0 lg:col-span-4">
          <SectionTitle
            aside={
              <Link to="/bookings" className="font-medium text-primary">
                View all
              </Link>
            }
          >
            Recent bookings
          </SectionTitle>
          {recentBookings.length === 0 ? (
            <EmptyState compact title="No bookings yet" />
          ) : (
            <ul className="space-y-1.5">
              {recentBookings.map((b, i) => (
                <li key={b.id || i}>
                  <Link
                    to={`/bookings/${b.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-low px-3 py-2 transition-colors hover:bg-surface-c"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{display(b.customerName || b.customer?.name || b.id)}</p>
                      <Muted className="truncate">{display(b.projectName || b.plotNumber || b.plotId)}</Muted>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeric text-xs font-medium">{formatPaise(b.agreementValuePaise || b.amountPaise)}</p>
                      <div className="pt-0.5">
                        <Chip>{humanize(b.stage || b.status)}</Chip>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="min-w-0 lg:col-span-4" tonal>
          <SectionTitle
            aside={
              <Link to="/reservations" className="font-medium text-primary">
                Manage
              </Link>
            }
          >
            Reservations at risk
          </SectionTitle>
          {atRisk.length === 0 ? (
            <EmptyState compact title="No active holds" description="Active reservations appear here." />
          ) : (
            <ul className="space-y-1.5">
              {atRisk.map((r, i) => (
                <li key={r.id || i} className="flex items-center justify-between gap-3 rounded-lg bg-surface-lowest px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{display(r.customerName || r.customer?.name || r.id)}</p>
                    <Mono className="text-[11px] text-muted-foreground">{display(r.plotNumber || r.plotId)}</Mono>
                  </div>
                  <StatusChip value={r.state || r.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 pt-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <SectionTitle
            aside={
              <Link to="/projects" className="inline-flex items-center gap-1 font-medium text-primary">
                All projects <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Projects
          </SectionTitle>
          {loading ? (
            <LoadingState variant="rows" rows={4} />
          ) : data.projects.length === 0 ? (
            <EmptyState compact title="No projects yet" description="Create one to open the setup workspace." />
          ) : (
            <Panel>
              <ul className="divide-y divide-outline-variant/30">
                {data.projects.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-1 py-3 hover:bg-surface-low">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{display(p.name)}</p>
                        <Mono className="text-muted-foreground">{display(p.code)}</Mono>
                      </div>
                      <div className="flex items-center gap-3">
                        <Muted>{display(p.city)}</Muted>
                        <StatusChip value={p.lifecycleStatus || p.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <Panel className="min-w-0">
          <SectionTitle
            aside={
              <Link to="/leads" className="font-medium text-primary">
                View all
              </Link>
            }
          >
            Recent leads
          </SectionTitle>
          {recentLeads.length === 0 ? (
            <EmptyState compact title="No leads yet" description="Leads captured by agents appear here." />
          ) : (
            <ul className="space-y-1">
              {recentLeads.map((l, i) => (
                <li key={l.id || i} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-low">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{display(l.name)}</p>
                    <Muted>{l.createdAt ? formatDateTime(l.createdAt) : display(l.phone)}</Muted>
                  </div>
                  <StatusChip value={l.stage} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
