import {
  BadgePlus,
  Bell,
  CalendarClock,
  CreditCard,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Map as MapIcon,
  Receipt,
  UserCog,
} from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { PublicUser } from '@bhairava/api-client';
import { AppShell, LoadingState, type NavGroup, type NavItem } from '@bhairava/ui-web';
import { api, tokens } from './api';
import { appPath, LOGO_SRC } from './basePath';

type AuthBootState = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

const navGroups: NavGroup[] = [
  {
    label: 'Home',
    items: [
      { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Discover',
    items: [{ to: '/explore', label: 'Explore Projects', icon: FolderKanban }],
  },
  {
    label: 'My portfolio',
    items: [
      { to: '/property', label: 'My Properties', icon: MapIcon },
      { to: '/bookings', label: 'My Bookings', icon: Receipt },
    ],
  },
  {
    label: 'Payments',
    items: [
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/schedules', label: 'Payment Schedule', icon: CalendarClock },
      { to: '/receipts', label: 'Receipts', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/documents', label: 'My Documents', icon: FileText },
      { to: '/support', label: 'Support', icon: BadgePlus },
      { to: '/profile', label: 'Profile', icon: UserCog },
    ],
  },
];

const tabItems: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/explore', label: 'Explore', icon: FolderKanban },
  { to: '/property', label: 'Properties', icon: MapIcon },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

type CustomerSession = {
  user: PublicUser | null;
  unreadCount: number;
  refreshUnread: () => void;
  signOut: () => void;
};

const SessionContext = createContext<CustomerSession>({
  user: null,
  unreadCount: 0,
  refreshUnread: () => {},
  signOut: () => {},
});

export const useCustomerSession = () => useContext(SessionContext);

async function performSignOut() {
  try {
    await api.auth.logout();
  } catch {
    /* cookie may already be gone; clear memory either way */
  }
  await tokens.clear();
  location.href = appPath('/login');
}

function AuthenticatedShell() {
  const { pathname } = useLocation();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((res) => {
        if (!cancelled) {
          setUser(res.user);
          if (res.user.needsProfile || res.user.profileComplete === false) {
            location.href = appPath('/onboarding');
          } else if (res.user.needsMpin) {
            location.href = appPath('/mpin');
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUnread = useCallback(() => {
    api.notifications
      .list({ unreadOnly: true, take: 100 })
      .then((rows) => setUnreadCount(rows.length))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(refreshUnread, [pathname, refreshUnread]);

  return (
    <SessionContext.Provider value={{ user, unreadCount, refreshUnread, signOut: () => void performSignOut() }}>
      <AppShell
        navGroups={navGroups}
        tabItems={tabItems}
        quickActions={[]}
        hideFab
        brandTitle="Bhairava"
        brandSubtitle="Customer portal"
        logoSrc={LOGO_SRC}
        user={user ? { name: user.displayName, email: user.email ?? undefined } : null}
        onSignOut={() => void performSignOut()}
        notificationsTo="/notifications"
        notificationCount={unreadCount}
      >
        <div className="mx-auto w-full max-w-6xl pb-16">
          <Outlet />
        </div>
      </AppShell>
    </SessionContext.Provider>
  );
}

/**
 * Access token lives in memory only. After a reload or new tab it is empty, so
 * the session is restored from the HTTP-only refresh cookie before rendering.
 */
export function CustomerShell() {
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
      <div data-testid="auth-initializing" className="grid min-h-dvh place-items-center bg-background px-6">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }
  if (boot === 'UNAUTHENTICATED') return <Navigate to="/login" replace />;
  return <AuthenticatedShell />;
}
