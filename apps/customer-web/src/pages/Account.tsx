import { CreditCard, FileText, KeyRound, LifeBuoy, LogOut, Map as MapIcon, ShieldCheck, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Btn, Chip, LinkBtn, LoadingState, PageHeader, Panel, SectionTitle } from '@bhairava/ui-web';
import { api } from '../api';
import { FactGrid } from '../components';
import { humanize } from '../lib/format';
import type { CustomerBooking } from '../lib/types';
import { useApi } from '../lib/use-api';
import { useCustomerSession } from '../shell';

/** Display version for Account & Security — keep in sync with apps/customer-web/package.json. */
const APP_VERSION = '0.1.0';

const topics: Array<{ to: string; title: string; body: string; icon: LucideIcon }> = [
  { to: '/payments', title: 'Payments & receipts', body: 'Check recorded payments and print receipts.', icon: CreditCard },
  { to: '/documents', title: 'Documents', body: 'Open agreements and papers shared with you.', icon: FileText },
  { to: '/bookings', title: 'Booking changes', body: 'Review your bookings before requesting a change.', icon: MapIcon },
];

export function SupportPage() {
  const bookings = useApi(() => api.bookings.list() as Promise<CustomerBooking[]>);
  const managers = Array.from(
    new Map(
      (bookings.data ?? [])
        .filter((b) => b.responsibleAgent)
        .map((b) => [b.responsibleAgent!.id, b.responsibleAgent!] as const),
    ).values(),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Support"
        description="We’re here to help with anything about your plot, payments or paperwork."
      />

      <Panel tonal className="flex flex-col gap-5 sm:flex-row sm:items-start sm:p-8">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-lowest text-primary shadow-ambient">
          <LifeBuoy className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold tracking-tight">Talk to your relationship manager</p>
          <p className="max-w-prose pt-1.5 text-sm leading-relaxed text-muted-foreground">
            Your assigned Bhairava agent is the fastest way to get answers about pricing, site visits, payment plans
            and documents. For anything else, our administration team is happy to help.
          </p>
          {bookings.loading && !bookings.data ? (
            <LoadingState className="items-start py-4" label="Finding your relationship manager…" />
          ) : managers.length > 0 ? (
            <ul className="flex flex-wrap gap-3 pt-5">
              {managers.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-surface-lowest px-4 py-3 shadow-ambient">
                  <UserRound className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="numeric text-xs text-muted-foreground">{m.code}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Panel>

      <section>
        <SectionTitle>Quick answers</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {topics.map((t) => (
            <Link key={t.to} to={t.to} className="block">
              <Panel className="lift h-full sm:p-7">
                <t.icon className="h-5 w-5 text-primary" strokeWidth={1.9} />
                <p className="pt-4 font-display text-base font-semibold tracking-tight">{t.title}</p>
                <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </Panel>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { user, signOut } = useCustomerSession();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Account" title="Profile" description="Your customer details, sign-in, and account security." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel className="sm:p-8">
          <SectionTitle>Your details</SectionTitle>
          {user ? (
            <FactGrid
              facts={[
                { label: 'Name', value: <span className="font-sans">{user.displayName}</span> },
                { label: 'Email', value: <span className="font-sans">{user.email || '—'}</span> },
                { label: 'Account type', value: <span className="font-sans">{humanize(user.roleCode)}</span> },
                {
                  label: 'Status',
                  value: <Chip tone={user.status === 'ACTIVE' ? 'positive' : 'warning'}>{humanize(user.status)}</Chip>,
                },
              ]}
            />
          ) : (
            <LoadingState label="Loading your profile…" />
          )}
        </Panel>

        <Panel tonal className="sm:p-8">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.9} />
          <p className="pt-4 font-display text-base font-semibold tracking-tight">Your privacy</p>
          <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">
            You only ever see records that belong to you. To update your contact details or identity documents,
            please <Link to="/support" className="font-medium text-primary">contact support</Link>.
          </p>
        </Panel>
      </div>

      <Panel className="sm:p-8">
        <SectionTitle aside={<KeyRound className="h-4 w-4" />}>Account & Security</SectionTitle>
        <dl className="space-y-5">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Google Account</dt>
            <dd className="truncate pt-1.5 text-base font-medium">{user?.email || '—'}</dd>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">MPIN</dt>
              <dd className="pt-1.5 text-base font-medium tracking-[0.35em]" aria-label="MPIN set">
                {user?.mpinSet === false ? 'Not set' : '••••'}
              </dd>
            </div>
            <LinkBtn to="/login?forgot=1" variant="tonal" className="shrink-0">
              Change MPIN
            </LinkBtn>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">App version</dt>
            <dd className="numeric pt-1.5 text-base font-medium">{APP_VERSION}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <Btn variant="tonal" onClick={signOut} data-testid="customer-profile-sign-out">
            <LogOut className="h-4 w-4 text-primary" /> Sign out
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
