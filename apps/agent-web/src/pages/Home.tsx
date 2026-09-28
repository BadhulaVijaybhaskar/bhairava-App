import { useMemo } from 'react';
import { CalendarClock, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Chip, EmptyState, LinkBtn, Metric, PageHeader, Panel, SectionTitle, Skeleton } from '@bhairava/ui-web';
import { api } from '../api';
import { useProjectNames, useRows, type RowsState } from '../lib/data';
import { formatDateTime, humanize, text } from '../lib/format';
import { UNREAD_CAP, useSession } from '../session';

function countOf(state: RowsState) {
  if (state.loading) return '—';
  if (state.err) return '!';
  return state.rows.length;
}

export function HomePage() {
  const { user, unreadCount } = useSession();
  const leads = useRows(() => api.leads.list());
  const visits = useRows(() => api.visits.list());
  const bookings = useRows(() => api.bookings.list());
  const projectNames = useProjectNames();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return visits.rows
      .filter((v) => v.status === 'SCHEDULED' && new Date(v.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [visits.rows]);
  const recentLeads = leads.rows.slice(0, 5);
  const unreadValue = unreadCount === null ? '—' : unreadCount >= UNREAD_CAP ? `${UNREAD_CAP}+` : unreadCount;

  return (
    <div>
      <PageHeader
        eyebrow="Agent portal"
        title={user?.displayName ? `Welcome, ${user.displayName}` : 'Home'}
        description="Your leads, visits and bookings. Every figure is scoped to records you own."
        actions={
          <>
            <LinkBtn to="/customers/onboarding" variant="tonal">
              <UserPlus className="h-4 w-4" /> Onboard customer
            </LinkBtn>
            <LinkBtn to="/visits/new" variant="tonal">
              <CalendarClock className="h-4 w-4" /> Schedule visit
            </LinkBtn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div data-testid="stat-leads">
          <Metric label="My leads" value={countOf(leads)} hint="Assigned to you" accent />
        </div>
        <div data-testid="stat-visits">
          <Metric label="Site visits" value={countOf(visits)} hint={`${upcoming.length} upcoming`} />
        </div>
        <Metric label="Bookings" value={countOf(bookings)} hint="Attributed to you" />
        <Metric label="Unread notifications" value={unreadValue} hint="In-app inbox" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle aside={<Link to="/visits" className="hover:text-foreground">All visits</Link>}>Upcoming visits</SectionTitle>
          {visits.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarClock}
              title="No upcoming visits"
              action={<LinkBtn to="/visits/new" variant="tonal">Schedule visit</LinkBtn>}
            />
          ) : (
            <ul className="space-y-1">
              {upcoming.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-low">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{projectNames.get(v.projectId) ?? 'Project'}</p>
                    <p className="numeric text-xs text-muted-foreground">{formatDateTime(v.scheduledAt)}</p>
                  </div>
                  <Chip>{humanize(v.status)}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionTitle aside={<Link to="/leads" className="hover:text-foreground">All leads</Link>}>Recent leads</SectionTitle>
          {leads.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : recentLeads.length === 0 ? (
            <EmptyState
              compact
              icon={UserPlus}
              title="No leads yet"
              action={<LinkBtn to="/leads/new" variant="tonal">Add a lead</LinkBtn>}
            />
          ) : (
            <ul className="space-y-1">
              {recentLeads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-low">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{text(l.name)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {text(l.phone)} · {projectNames.get(l.projectId) ?? 'No project'}
                    </p>
                  </div>
                  <Chip>{humanize(l.stage)}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
