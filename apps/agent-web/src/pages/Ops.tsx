import { useState } from 'react';
import { Bell, CheckCheck, FileText, KeyRound, LogOut, ShieldCheck, UserCog } from 'lucide-react';
import {
  Btn,
  Chip,
  EmptyState,
  ErrorState,
  LinkBtn,
  LoadingState,
  PageHeader,
  Panel,
  SectionTitle,
  cn,
  type DataTableColumn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Notice, RecordList } from '../components/RecordList';
import { useRows, type Row } from '../lib/data';
import { errorMessage, formatDate, formatDateTime, humanize, text } from '../lib/format';
import { useSession } from '../session';

/** Display version for Account & Security — keep in sync with apps/agent-web/package.json. */
const APP_VERSION = '0.1.0';

export function DocumentsPage() {
  const documents = useRows(() => api.documents.list());
  const columns: DataTableColumn<Row>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (r) => (
        <span className="min-w-0">
          <span className="block truncate font-medium">{text(r.title)}</span>
          {r.docType ? <span className="block text-xs text-muted-foreground">{humanize(r.docType)}</span> : null}
        </span>
      ),
    },
    { key: 'visibility', header: 'Visibility', cell: (r) => <Chip tone="neutral">{humanize(r.visibility)}</Chip> },
    { key: 'version', header: 'Version', align: 'right', cell: (r) => <span className="numeric">v{text(r.version, '1')}</span> },
    { key: 'created', header: 'Added', cell: (r) => <span className="numeric">{formatDate(r.createdAt)}</span> },
  ];
  return (
    <div>
      <PageHeader eyebrow="Ops" title="Documents" description="Documents shared with agents or linked to your customers and bookings." />
      <RecordList
        state={documents}
        columns={columns}
        emptyIcon={FileText}
        emptyTitle="No documents"
        emptyDescription="Documents visible to agents will appear here."
        testId="agent-docs"
      />
    </div>
  );
}

export function NotificationsPage() {
  const { refreshUnread } = useSession();
  const notifications = useRows(() => api.notifications.list());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const unread = notifications.rows.filter((n) => !n.readAt).length;

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setErr('');
    try {
      await action();
      notifications.reload();
      refreshUnread();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  let body;
  if (notifications.loading && notifications.rows.length === 0) body = <LoadingState variant="rows" />;
  else if (notifications.err) body = <ErrorState title="Could not load notifications" error={notifications.err} onRetry={notifications.reload} />;
  else if (notifications.rows.length === 0) body = <EmptyState icon={Bell} title="You're all caught up" description="New alerts about your leads, visits and bookings land here." />;
  else {
    body = (
      <Panel className="p-2 sm:p-3">
        <ul className="divide-y divide-[color-mix(in_oklab,var(--outline-variant)_40%,transparent)]">
          {notifications.rows.map((n) => {
            const isUnread = !n.readAt;
            return (
              <li
                key={n.id}
                className={cn('flex items-start gap-3 rounded-xl px-3 py-3.5 sm:px-4', isUnread && 'bg-primary/5')}
              >
                <span
                  aria-hidden
                  className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm', isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground')}>
                    {text(n.title)}
                  </p>
                  {n.body ? <p className="pt-0.5 text-sm leading-relaxed break-words text-muted-foreground">{n.body}</p> : null}
                  <p className="numeric pt-1.5 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt ?? n.sentAt)}</p>
                </div>
                {isUnread ? (
                  <Btn
                    variant="ghost"
                    className="min-h-9 shrink-0 px-2.5 text-xs"
                    disabled={busy !== null}
                    onClick={() => void run(n.id, () => api.notifications.markRead(n.id))}
                  >
                    {busy === n.id ? 'Marking…' : 'Mark read'}
                  </Btn>
                ) : (
                  <span className="shrink-0 pt-1 text-xs text-muted-foreground">Read</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        description={unread ? `${unread} unread` : 'Everything is read.'}
        actions={
          <Btn
            variant="tonal"
            disabled={busy !== null || unread === 0}
            onClick={() => void run('all', () => api.notifications.markAllRead())}
          >
            <CheckCheck className="h-4 w-4" />
            {busy === 'all' ? 'Marking…' : 'Mark all read'}
          </Btn>
        }
      />
      {err ? (
        <div className="mb-4">
          <Notice tone="error">{err}</Notice>
        </div>
      ) : null}
      {body}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate pt-1 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ProfilePage() {
  const { user, signOut } = useSession();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Ops" title="Profile" description="Your agent identity, sign-in details, and account security." />
      <div className="space-y-4">
        <Panel>
          <SectionTitle aside={<UserCog className="h-4 w-4" />}>Signed in as</SectionTitle>
          {user ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Fact label="Name">{text(user.displayName)}</Fact>
              <Fact label="Email">{text(user.email)}</Fact>
              <Fact label="Role"><Chip tone="info">{humanize(user.roleCode)}</Chip></Fact>
              <Fact label="Status"><Chip>{humanize(user.status)}</Chip></Fact>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading your account…</p>
          )}
        </Panel>

        <Panel>
          <SectionTitle aside={<KeyRound className="h-4 w-4" />}>Account & Security</SectionTitle>
          <dl className="space-y-5">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Google Account</dt>
              <dd className="truncate pt-1 text-sm font-medium">{text(user?.email)}</dd>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">MPIN</dt>
                <dd className="pt-1 text-sm font-medium tracking-[0.35em]" aria-label="MPIN set">
                  {user?.mpinSet === false ? 'Not set' : '••••'}
                </dd>
              </div>
              <LinkBtn to="/login?forgot=1" variant="tonal" className="shrink-0">
                Change MPIN
              </LinkBtn>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">App version</dt>
              <dd className="numeric pt-1 text-sm font-medium">{APP_VERSION}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <Btn variant="tonal" onClick={signOut} data-testid="agent-profile-sign-out">
              <LogOut className="h-4 w-4 text-primary" /> Sign out
            </Btn>
          </div>
        </Panel>

        <Panel tonal>
          <SectionTitle aside={<ShieldCheck className="h-4 w-4" />}>Data scope</SectionTitle>
          <ul className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
            <li>Leads, customers, visits, reservations, bookings, collections and commissions are filtered by the API to records you own or are attributed to.</li>
            <li>Personal details of customers owned by other agents are redacted server-side and shown as "Restricted".</li>
            <li>Account, role and organization settings are managed by your administrator.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
