import { Bell, BellOff, Check, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Btn, cn, EmptyState, PageHeader, Panel } from '@bhairava/ui-web';
import { api } from '../api';
import { AsyncSection } from '../components';
import { formatDateTime } from '../lib/format';
import type { CustomerNotification } from '../lib/types';
import { useApi } from '../lib/use-api';
import { useCustomerSession } from '../shell';

const tabs = ['All', 'Unread'] as const;

export function NotificationsPage() {
  const state = useApi(() => api.notifications.list() as unknown as Promise<CustomerNotification[]>);
  const { refreshUnread } = useCustomerSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const [busy, setBusy] = useState(false);

  const rows = state.data ?? [];
  const unreadCount = rows.filter((n) => !n.readAt).length;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      state.reload();
      refreshUnread();
    }
  }

  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Home"
        title="Notifications"
        description="Updates about your bookings, payments and documents."
        actions={
          unreadCount > 0 ? (
            <Btn variant="tonal" disabled={busy} onClick={() => void run(() => api.notifications.markAllRead())}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Btn>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-2 pb-4">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              t === tab ? 'bg-surface-lowest text-foreground shadow-ambient' : 'text-muted-foreground hover:bg-surface-c',
            )}
          >
            {t}
            {t === 'Unread' && unreadCount > 0 ? (
              <span className="numeric ml-1.5 rounded-full bg-primary/12 px-1.5 py-0.5 text-[11px] text-primary">{unreadCount}</span>
            ) : null}
          </button>
        ))}
      </div>
      <AsyncSection state={state}>
        {(all) => {
          const visible = tab === 'Unread' ? all.filter((n) => !n.readAt) : all;
          if (visible.length === 0) {
            return (
              <EmptyState
                icon={BellOff}
                title={tab === 'Unread' ? 'You’re all caught up' : 'No notifications yet'}
                description={
                  tab === 'Unread'
                    ? 'New updates will show up here.'
                    : 'We’ll let you know here when something changes on your bookings or payments.'
                }
              />
            );
          }
          return (
            <Panel className="overflow-hidden p-0 sm:p-0">
              <ul data-testid="notifications-list">
                {visible.map((n, i) => {
                  const unread = !n.readAt;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex items-start gap-4 px-5 py-5 sm:px-7',
                        i > 0 && 'border-t border-outline-variant/25',
                        unread && 'bg-surface-low',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl',
                          unread ? 'bg-primary/12 text-primary' : 'bg-surface-c text-muted-foreground',
                        )}
                      >
                        <Bell className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {unread ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                          <p className={cn('text-sm', unread ? 'font-semibold' : 'font-medium text-foreground/90')}>{n.title}</p>
                        </div>
                        {n.body ? <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p> : null}
                        <p className="numeric pt-2 text-[11px] text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                      </div>
                      {unread ? (
                        <Btn
                          variant="ghost"
                          className="shrink-0"
                          disabled={busy}
                          onClick={() => void run(() => api.notifications.markRead(n.id))}
                          aria-label={`Mark “${n.title}” as read`}
                        >
                          <Check className="h-4 w-4" />
                          <span className="hidden sm:inline">Mark read</span>
                        </Btn>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        }}
      </AsyncSection>
    </div>
  );
}
