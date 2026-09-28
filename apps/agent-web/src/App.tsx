import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import {
  BadgePlus,
  Bell,
  CalendarClock,
  CalendarPlus,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { AppShell, LoadingState, type NavGroup, type NavItem } from '@bhairava/ui-web';
import type { PublicUser } from '@bhairava/api-client';
import { api, tokens } from './api';
import { appPath, LOGO_SRC } from './basePath';
import { SessionContext, UNREAD_CAP, type AgentSession } from './session';
import { LoginPage, AgentOnboardingPage, AgentMpinPage } from './pages/Login';
import { HomePage } from './pages/Home';
import { PlotDetailPage, ProjectDetailPage, ProjectsPage } from './pages/Projects';
import { BookingsPage, CustomersPage, LeadsPage, ReservationsPage, VisitsPage } from './pages/Sales';
import { CreateLeadPage, CustomerOnboardingPage, ScheduleVisitPage, InviteCustomerPage } from './pages/Forms';
import { CollectionsPage, CommissionsPage } from './pages/Finance';
import { DocumentsPage, NotificationsPage, ProfilePage } from './pages/Ops';

type AuthBootState = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  { label: 'Portfolio', items: [{ to: '/projects', label: 'Projects', icon: FolderKanban }] },
  {
    label: 'Sales',
    items: [
      { to: '/leads', label: 'Leads', icon: BadgePlus },
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/visits', label: 'Site Visits', icon: CalendarClock },
      { to: '/reservations', label: 'Reservations', icon: Clock },
      { to: '/bookings', label: 'Bookings', icon: Receipt },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/collections', label: 'Collections', icon: Wallet },
      { to: '/commissions', label: 'Commissions', icon: Trophy },
    ],
  },
  {
    label: 'Ops',
    items: [
      { to: '/documents', label: 'Documents', icon: FileText },
      { to: '/profile', label: 'Profile', icon: UserCog },
    ],
  },
];

const QUICK_ACTIONS: NavItem[] = [
  { to: '/leads/new', label: 'New lead', icon: BadgePlus },
  { to: '/customers/invite', label: 'Invite customer', icon: UserPlus },
  { to: '/customers/onboarding', label: 'Add customer', icon: UserPlus },
  { to: '/visits/new', label: 'Schedule visit', icon: CalendarPlus },
];

const TAB_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/leads', label: 'Leads', icon: BadgePlus },
  { to: '/customers', label: 'Customers', icon: Users },
];

const FORM_ROUTES = new Set(['/leads/new', '/customers/onboarding', '/customers/invite', '/visits/new']);

async function signOut() {
  try {
    await api.auth.logout();
  } catch {}
  await tokens.clear();
  location.href = appPath('/login');
}

/** Resolves the session before any authenticated screen renders. */
function AuthGate() {
  const [boot, setBoot] = useState<AuthBootState>('AUTH_INITIALIZING');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await tokens.getAccessToken();
        if (access) {
          if (!cancelled) setBoot('AUTHENTICATED');
          return;
        }
        // Empty in-memory access after refresh/new tab — restore via HTTP-only cookie.
        const restored = await api.auth.restoreSession();
        if (!cancelled) setBoot(restored ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
      } catch {
        if (!cancelled) setBoot('UNAUTHENTICATED');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot === 'AUTH_INITIALIZING') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background" data-testid="auth-initializing">
        <LoadingState label="Restoring session…" />
      </div>
    );
  }
  if (boot === 'UNAUTHENTICATED') return <Navigate to="/login" replace />;
  return <AgentShell />;
}

function AgentShell() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refreshUnread = useCallback(() => {
    api.notifications
      .list({ unreadOnly: true, take: UNREAD_CAP })
      .then((rows) => setUnreadCount(rows.length))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) {
          setUser(res.user);
          if ((res.user as any).needsProfile || (res.user as any).profileComplete === false) {
            location.href = appPath('/onboarding');
          } else if ((res.user as any).needsMpin) {
            location.href = appPath('/mpin');
          }
        }
      })
      .catch(() => {});
    refreshUnread();
    return () => {
      cancelled = true;
    };
  }, [refreshUnread]);

  const session = useMemo<AgentSession>(
    () => ({ user, unreadCount, refreshUnread, signOut: () => void signOut() }),
    [user, unreadCount, refreshUnread],
  );

  return (
    <SessionContext.Provider value={session}>
      <AppShell
        navGroups={NAV_GROUPS}
        quickActions={QUICK_ACTIONS}
        tabItems={TAB_ITEMS}
        primaryAction={QUICK_ACTIONS[0]}
        brandTitle="Bhairava"
        brandSubtitle="Agent portal"
        logoSrc={LOGO_SRC}
        user={user ? { name: user.displayName, email: user.email ?? undefined } : null}
        onSignOut={() => void signOut()}
        notificationCount={unreadCount ?? 0}
        notificationsTo="/notifications"
        hideFabOn={(pathname) => FORM_ROUTES.has(pathname)}
      >
        <div className="mx-auto w-full max-w-6xl pb-16">
          <Outlet />
        </div>
      </AppShell>
    </SessionContext.Provider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<AgentOnboardingPage />} />
      <Route path="/mpin" element={<AgentMpinPage />} />
      <Route element={<AuthGate />}>
        <Route index element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/plots/:plotId" element={<PlotDetailPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/new" element={<CreateLeadPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/visits/new" element={<ScheduleVisitPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/onboarding" element={<CustomerOnboardingPage />} />
        <Route path="/customers/invite" element={<InviteCustomerPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/commissions" element={<CommissionsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
