import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BadgePlus,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  FolderKanban,
  FolderPlus,
  Grid3x3,
  LayoutDashboard,
  Map,
  PieChart,
  Receipt,
  Repeat,
  ScrollText,
  Shield,
  Stamp,
  TrendingUp,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';
import { AppShell, LoadingState, type AppShellUser, type NavGroup, type NavItem } from '@bhairava/ui-web';
import { api, tokens } from '../api';
import { appPath, LOGO_SRC } from '../basePath';
import { useAuthed } from '../lib/data';

export const adminNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/plots', label: 'Plots', icon: Grid3x3 },
      { to: '/layouts', label: 'Layouts', icon: Map },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/agents', label: 'Agents', icon: UserCog },
      { to: '/leads', label: 'Leads', icon: BadgePlus },
      { to: '/visits', label: 'Site Visits', icon: CalendarClock },
      { to: '/reservations', label: 'Reservations', icon: Clock },
      { to: '/bookings', label: 'Bookings', icon: Receipt },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/collections', label: 'Collections', icon: Wallet },
      { to: '/schedule', label: 'Schedule', icon: CalendarDays },
      { to: '/receipts', label: 'Receipts', icon: FileText },
      { to: '/commissions', label: 'Commissions', icon: Trophy },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/registrations', label: 'Registrations', icon: Stamp },
      { to: '/resale', label: 'Resale', icon: Repeat },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports/sales', label: 'Sales', icon: BarChart3 },
      { to: '/reports/inventory', label: 'Inventory', icon: PieChart },
      { to: '/reports/collections', label: 'Collections', icon: TrendingUp },
      { to: '/reports/agents', label: 'Agents', icon: Trophy },
      { to: '/reports/customers', label: 'Customers', icon: Users },
      { to: '/reports/registrations', label: 'Registrations', icon: Stamp },
      { to: '/reports/resale', label: 'Resale', icon: Repeat },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/settings/users', label: 'Members', icon: Shield },
      { to: '/settings/audit', label: 'Audit', icon: ScrollText },
      { to: '/settings/company', label: 'Company', icon: Building2 },
      { to: '/settings/billing', label: 'Billing', icon: CreditCard },
      { to: '/settings/danger', label: 'Danger Zone', icon: AlertTriangle },
    ],
  },
];

const quickActions: NavItem[] = [
  { to: '/onboarding/project', label: 'New project', icon: FolderPlus },
  { to: '/onboarding/plot', label: 'New plot', icon: Grid3x3 },
  { to: '/onboarding/customer', label: 'New customer', icon: UserPlus },
  { to: '/onboarding/agent', label: 'New agent', icon: BadgePlus },
  { to: '/onboarding/visit', label: 'Site visit', icon: CalendarClock },
  { to: '/onboarding/reservation', label: 'Reservation', icon: Clock },
  { to: '/onboarding/booking', label: 'Booking', icon: Receipt },
  { to: '/conversion', label: 'Lead conversion', icon: Workflow },
];

const fabActions: NavItem[] = [
  { to: '/onboarding/booking', label: 'New booking', icon: Receipt },
  { to: '/onboarding/customer', label: 'New customer', icon: UserPlus },
  { to: '/onboarding/visit', label: 'Site visit', icon: CalendarClock },
  { to: '/onboarding/reservation', label: 'New reservation', icon: Clock },
  { to: '/onboarding/project', label: 'New project', icon: FolderPlus },
  { to: '/onboarding/agent', label: 'New agent', icon: BadgePlus },
];

const tabItems: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/plots', label: 'Plots', icon: Map },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/collections', label: 'Money', icon: Wallet },
];

async function signOut() {
  try {
    await api.auth.logout();
  } catch {
    /* ignore — clear local session regardless */
  }
  await tokens.clear();
  location.href = appPath('/login');
}

function hideFabOn(p: string) {
  return (
    p.startsWith('/onboarding') ||
    p.startsWith('/customers/onboarding') ||
    p.startsWith('/conversion') ||
    p.startsWith('/settings') ||
    p.startsWith('/layouts')
  );
}

function AuthedShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState<AppShellUser | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then((r) => setUser({ name: r.user.displayName || r.user.email || 'Signed in', email: r.user.email ?? undefined }))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    api.notifications
      .list({ unreadOnly: true, take: 100 })
      .then((rows) => setUnread(Array.isArray(rows) ? rows.length : 0))
      .catch(() => setUnread(0));
  }, [pathname]);

  return (
    <AppShell
      navGroups={adminNavGroups}
      quickActions={quickActions}
      fabActions={fabActions}
      tabItems={tabItems}
      brandTitle="Bhairava"
      logoSrc={LOGO_SRC}
      brandSubtitle="Admin · Land Sales OS"
      user={user}
      notificationsTo="/notifications"
      notificationCount={unread}
      primaryAction={{ to: '/onboarding/customer', label: 'New customer', icon: UserPlus }}
      onSignOut={() => void signOut()}
      hideFabOn={hideFabOn}
    >
      {children}
    </AppShell>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { ready, authed } = useAuthed();
  if (!ready) return <LoadingState label="Restoring session…" className="min-h-dvh" />;
  if (!authed) return <Navigate to="/login" replace />;
  return <AuthedShell>{children}</AuthedShell>;
}
