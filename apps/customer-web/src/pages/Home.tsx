import { ArrowRight, CalendarClock, FileText, FolderKanban, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingState, Metric, PageHeader, Panel, SectionTitle } from '@bhairava/ui-web';
import { api } from '../api';
import { formatPaise, sumPaise } from '../lib/format';
import type { CustomerBooking, CustomerNotification, CustomerPayment } from '../lib/types';
import { useApi } from '../lib/use-api';
import { useCustomerSession } from '../shell';

const shortcuts: Array<{ to: string; title: string; body: string; icon: LucideIcon }> = [
  { to: '/explore', title: 'Explore projects', body: 'Browse open projects and live plot availability.', icon: FolderKanban },
  { to: '/schedules', title: 'Payment schedule', body: 'See what’s due next on your instalments.', icon: CalendarClock },
  { to: '/receipts', title: 'Receipts', body: 'View and print receipts for every payment.', icon: Receipt },
  { to: '/documents', title: 'My documents', body: 'Agreements and papers shared with you.', icon: FileText },
];

export function HomePage() {
  const { user } = useCustomerSession();
  const bookings = useApi(() => api.bookings.list() as Promise<CustomerBooking[]>);
  const payments = useApi(() => api.payments.list() as Promise<CustomerPayment[]>);
  const notifs = useApi(() => api.notifications.list() as unknown as Promise<CustomerNotification[]>);

  const loading = bookings.loading || payments.loading || notifs.loading;
  const bookingRows = bookings.data ?? [];
  const paymentRows = (payments.data ?? []).filter((p) => !p.voidedAt);
  const unread = (notifs.data ?? []).filter((n) => !n.readAt).length;
  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Customer portal"
        title={firstName ? `Hello, ${firstName}` : 'Welcome home'}
        description="A calm overview of your plots, payments and updates from the Bhairava team."
      />

      {loading && !bookings.data && !payments.data ? (
        <LoadingState variant="metrics" rows={3} className="lg:grid-cols-3" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          <Link to="/bookings" className="block">
            <Metric
              accent
              label="My bookings"
              value={bookings.error ? '—' : bookingRows.length}
              hint={bookingRows.length === 1 ? 'Active property record' : 'Property records'}
            />
          </Link>
          <Link to="/payments" className="block">
            <Metric
              label="Payments made"
              value={payments.error ? '—' : paymentRows.length}
              hint={paymentRows.length ? `${formatPaise(sumPaise(paymentRows.map((p) => p.amountPaise)))} paid` : 'No payments yet'}
            />
          </Link>
          <Link to="/notifications" className="block">
            <Metric
              label="Unread updates"
              value={notifs.error ? '—' : unread}
              hint={unread ? 'Tap to catch up' : 'You’re all caught up'}
            />
          </Link>
        </div>
      )}

      <section>
        <SectionTitle>Where would you like to go?</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="group block">
              <Panel tonal className="lift flex h-full items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-lowest text-primary shadow-ambient">
                  <s.icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold tracking-tight">{s.title}</p>
                  <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
              </Panel>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
