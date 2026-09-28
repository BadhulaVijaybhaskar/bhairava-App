import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, BellOff, Check, CheckCheck } from 'lucide-react';
import { Btn, Chip, EmptyState, ErrorState, LinkBtn, LoadingState, PageHeader, Panel, Tabs, cn } from '@bhairava/ui-web';
import { api } from '../api';
import { Notice } from '../components/common';
import { errMsg, formatDateTime, humanize, type AnyRow } from '../lib/data';

type View = 'all' | 'unread';

export function NotificationsPage() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [tab, setTab] = useState<View>('all');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setErr('');
    setLoading(true);
    api.notifications
      .list({ unreadOnly: tab === 'unread', take: 100 })
      .then(setRows)
      .catch((e) => setErr(errMsg(e)))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { reload(); }, [reload]);

  async function markOne(id: string) {
    setMsg('');
    try {
      await api.notifications.markRead(id);
      setMsg('Marked read');
      reload();
    } catch (e) { setErr(errMsg(e)); }
  }

  async function markAll() {
    setMsg('');
    try {
      const r = await api.notifications.markAllRead();
      setMsg(`Marked ${r?.updated ?? 0} read`);
      reload();
    } catch (e) { setErr(errMsg(e)); }
  }

  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Notifications"
        description="In-app events for payments, bookings, documents, registrations and resale. Email, SMS, WhatsApp and push adapters await external credentials."
        actions={
          <Btn variant="tonal" data-testid="notifications-mark-all" onClick={() => void markAll()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Btn>
        }
      />
      <Tabs<View>
        items={[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread', count: unread },
        ]}
        value={tab}
        onChange={setTab}
        aria-label="Notification filter"
        className="mb-4 w-fit max-w-full"
      />
      <div className="space-y-2 pb-4 empty:hidden">
        <Notice tone="err">{err}</Notice>
        <Notice tone="ok">{msg}</Notice>
      </div>
      {loading && rows.length === 0 ? (
        <LoadingState variant="rows" />
      ) : err && rows.length === 0 ? (
        <ErrorState title="Couldn't load notifications" error={err} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={BellOff} title={tab === 'unread' ? "You're all caught up" : 'No notifications'} description="New events will appear here as they happen." />
      ) : (
        <Panel className="p-2 sm:p-2">
          <ul className="divide-y divide-outline-variant/25">
            {rows.map((n) => {
              const href = (n.payloadJson && (n.payloadJson as AnyRow).href) || null;
              const kind = (n.payloadJson && (n.payloadJson as AnyRow).kind) || n.channel;
              const isUnread = !n.readAt;
              return (
                <li
                  key={n.id}
                  data-testid="notif-row"
                  className={cn(
                    'flex flex-wrap items-start justify-between gap-3 rounded-xl px-3 py-3.5 sm:flex-nowrap',
                    isUnread && 'bg-surface-low',
                  )}
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      aria-hidden
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-outline-variant/60')}
                    />
                    <div className="min-w-0">
                      <p className={cn('text-sm', isUnread ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                      {n.body ? <p className="pt-0.5 text-sm text-muted-foreground">{n.body}</p> : null}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {kind ? <Chip tone="info">{humanize(kind)}</Chip> : null}
                        <span className="numeric text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pl-5 sm:pl-0">
                    {href ? (
                      <LinkBtn to={String(href)} className="min-h-9 px-3 text-xs">
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </LinkBtn>
                    ) : null}
                    {isUnread ? (
                      <Btn variant="tonal" className="min-h-9 px-3 text-xs" onClick={() => void markOne(n.id)}>
                        <Check className="h-3.5 w-3.5" /> Mark read
                      </Btn>
                    ) : (
                      <Chip tone="positive">Read</Chip>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
