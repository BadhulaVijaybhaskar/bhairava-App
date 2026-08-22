import { Link, useRouterState } from "@tanstack/react-router";
import {
  FolderPlus,
  UserPlus,
  BadgePlus,
  LayoutDashboard,
  FolderKanban,
  Map,
  Grid3x3,
  PenTool,
  Users,
  UserCog,
  Clock,
  Receipt,
  Wallet,
  CreditCard,
  CalendarClock,
  FileText,
  Stamp,
  Repeat,
  BarChart3,
  TrendingUp,
  PieChart,
  Trophy,
  Bell,
  Shield,
  ScrollText,
  Building2,
  Search,
  Plus,
  Menu,
  X,
  LogOut,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { notifications } from "@/lib/mock-data";
import { getSession, signOut } from "@/lib/auth";
import { useCreateFabBlocked } from "@/lib/fab-visibility";
import { BrandLogo } from "@/components/brand";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Onboarding",
    items: [
      { to: "/onboarding/project", label: "New project", icon: FolderPlus },
      { to: "/onboarding/plot", label: "New plot", icon: Grid3x3 },
      { to: "/onboarding/customer", label: "New customer", icon: UserPlus },
      { to: "/onboarding/agent", label: "New agent", icon: BadgePlus },
      { to: "/onboarding/visit", label: "Site visit", icon: CalendarClock },
      { to: "/onboarding/reservation", label: "New reservation", icon: Clock },
      { to: "/onboarding/booking", label: "New booking", icon: Receipt },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/plots/layout", label: "Live plot layout", icon: Map },
      { to: "/plots", label: "Plot inventory", icon: Grid3x3 },
      { to: "/plots/editor", label: "Layout editor", icon: PenTool },
      { to: "/resale", label: "Resale inventory", icon: Repeat },
    ],
  },
  {
    label: "Relationships",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/agents", label: "Agents", icon: UserCog },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/site-visits", label: "Site visits", icon: CalendarClock },
      { to: "/reservations", label: "Reservations", icon: Clock },
      { to: "/bookings", label: "Bookings", icon: Receipt },
      { to: "/registrations", label: "Registrations", icon: Stamp },
      { to: "/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/collections", label: "Collections", icon: Wallet },
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/schedule", label: "Payment schedule", icon: CalendarClock },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/reports/sales", label: "Sales", icon: BarChart3 },
      { to: "/reports/collections", label: "Collections", icon: TrendingUp },
      { to: "/reports/inventory", label: "Inventory", icon: PieChart },
      { to: "/reports/agents", label: "Agent performance", icon: Trophy },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/settings/users", label: "Users & roles", icon: Shield },
      { to: "/settings/audit", label: "Audit logs", icon: ScrollText },
      { to: "/settings/company", label: "Company settings", icon: Building2 },
    ],
  },
];

const quickActions: NavItem[] = [
  { to: "/onboarding/project", label: "New project", icon: FolderPlus },
  { to: "/onboarding/plot", label: "New plot", icon: Grid3x3 },
  { to: "/onboarding/customer", label: "New customer", icon: UserPlus },
  { to: "/onboarding/agent", label: "New agent", icon: BadgePlus },
  { to: "/onboarding/visit", label: "Site visit", icon: CalendarClock },
  { to: "/onboarding/reservation", label: "Reservation", icon: Clock },
  { to: "/onboarding/booking", label: "Booking", icon: Receipt },
];

const moreSections = navGroups.filter((group) => group.label !== "Onboarding");
const pairedSection = new Set(["Overview", "Inventory", "Finance", "Reports"]);

const tabItems: NavItem[] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/plots/layout", label: "Plots", icon: Map },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/collections", label: "Money", icon: Wallet },
];

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function BrandMark() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <BrandLogo size={38} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-base font-semibold tracking-tight">
          Bhairava
        </span>
        <span className="block truncate text-[11px] tracking-wide text-muted-foreground">
          Land Sales OS
        </span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors lg:py-2",
                    active
                      ? "bg-surface-lowest font-medium text-foreground shadow-ambient"
                      : "text-muted-foreground hover:bg-surface-c hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                    strokeWidth={1.9}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function handleSignOut() {
  signOut();
  window.location.replace("/login");
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-c px-3 text-sm font-medium text-foreground transition-colors active:bg-surface-highest",
        className,
      )}
    >
      <LogOut className="h-4 w-4 text-primary" strokeWidth={2} />
      Sign out
    </button>
  );
}

function UserCard() {
  const session = getSession();
  return (
    <div className="shrink-0 rounded-xl bg-surface-c px-3 py-3">
      <p className="text-xs font-medium">{session?.name ?? "Vijay Bhaskar"}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {session?.email ?? "admin@bhairava.com"}
      </p>
      <SignOutButton className="mt-2 w-full" />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-surface-low px-4 pt-6 pb-6 lg:flex">
      <div className="mb-6 shrink-0 px-2">
        <BrandMark />
      </div>
      <NavList />
      <div className="mt-4 shrink-0">
        <UserCard />
      </div>
    </aside>
  );
}

function matchesQuery(label: string, query: string) {
  return !query || label.toLowerCase().includes(query);
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCollapsed({});
      return;
    }
    const html = document.documentElement;
    const main = document.querySelector(".app-shell-main");
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevMain = main instanceof HTMLElement ? main.style.overflow : "";
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    html.classList.add("more-menu-open");
    if (main instanceof HTMLElement) main.style.overflow = "hidden";

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".mobile-more-scroll")) return;
      event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("keydown", onKey);

    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      html.classList.remove("more-menu-open");
      if (main instanceof HTMLElement) main.style.overflow = prevMain;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleQuick = useMemo(
    () => quickActions.filter((item) => matchesQuery(item.label, normalizedQuery)),
    [normalizedQuery],
  );
  const visibleSections = useMemo(
    () =>
      moreSections
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matchesQuery(item.label, normalizedQuery)),
        }))
        .filter((group) => group.items.length > 0),
    [normalizedQuery],
  );
  const hasResults = visibleQuick.length > 0 || visibleSections.length > 0;

  if (!open || !mounted) return null;

  return createPortal(
    <div className="mobile-more-overlay lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
      />
      <div className="mobile-more-sheet">
        <header className="mobile-more-header">
          <div className="mobile-more-handle" aria-hidden="true" />
          <div className="mobile-more-brand-row">
            <Link to="/" onClick={onClose} className="mobile-more-brand">
              <BrandLogo size={32} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-[15px] font-semibold tracking-tight">
                  Bhairava
                </span>
                <span className="block truncate text-[10px] tracking-wide text-muted-foreground">
                  Land Sales OS
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="mobile-more-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="mobile-more-scroll">
          <div className="mobile-more-toolbar">
            <label className="mobile-more-search">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search menu..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <button type="button" onClick={handleSignOut} className="mobile-more-signout">
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.1} />
              Sign out
            </button>
          </div>

          {visibleQuick.length > 0 ? (
            <section className="mobile-more-quick-wrap">
              <p className="mobile-more-kicker">Quick actions</p>
              <div className="mobile-more-quick">
                {visibleQuick.map((item) => {
                  const active = isActive(pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn("mobile-more-quick-tile", active && "is-active")}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={active ? 2.1 : 1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {hasResults ? (
            <div className="more-section-pairs">
              {visibleSections.map((group) => {
                const expanded = Boolean(normalizedQuery) || !collapsed[group.label];
                return (
                  <section
                    key={group.label}
                    className="mobile-more-section"
                    data-span={pairedSection.has(group.label) ? "false" : "true"}
                  >
                    <button
                      type="button"
                      className="mobile-more-section-head"
                      aria-expanded={expanded}
                      onClick={() =>
                        setCollapsed((prev) => ({ ...prev, [group.label]: !prev[group.label] }))
                      }
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                          !expanded && "-rotate-90",
                        )}
                      />
                    </button>
                    <div className={cn("mobile-more-section-body", expanded && "is-open")}>
                      <div>
                        <div className="mobile-more-grid" data-count={group.items.length}>
                          {group.items.map((item) => {
                            const active = isActive(pathname, item.to);
                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={onClose}
                                className={cn("mobile-more-tile", active && "is-active")}
                              >
                                <item.icon className="h-5 w-5" strokeWidth={active ? 2.1 : 1.75} />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="mobile-more-empty">No matching actions</p>
          )}
          <div className="mobile-more-scroll-end" aria-hidden="true" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TopBar() {
  const unread = notifications.filter((n) => n.unread).length;
  return (
    <header className="glass sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-2 px-4 pt-[env(safe-area-inset-top)] sm:gap-4 sm:px-6 lg:flex">
      <Link to="/" className="shrink-0 lg:hidden">
        <BrandLogo size={30} />
      </Link>
      <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-low px-3 md:max-w-md">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          placeholder="Search…"
          className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded bg-surface-c px-1.5 py-0.5 text-[10px] text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </label>
      <div className="hidden flex-1 md:block" />
      <Link
        to="/onboarding/booking"
        className="gradient-primary hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground sm:flex"
      >
        <Plus className="h-4 w-4" /> New booking
      </Link>
      <Link to="/notifications" className="relative shrink-0 rounded-lg bg-surface-low p-2">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-container" />
        )}
      </Link>
    </header>
  );
}

function BottomTabs({ onMore, menuOpen }: { onMore: () => void; menuOpen: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <nav
      className="mobile-bottom-nav grid grid-cols-5 gap-1 px-2 pt-1.5 lg:hidden"
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        zIndex: 1000,
        transform: "none",
      }}
    >
      {tabItems.map((item) => {
        const active = !menuOpen && isActive(pathname, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-label="More"
        className={cn(
          "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
          menuOpen ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Menu className="h-5 w-5" strokeWidth={menuOpen ? 2.2 : 1.8} />
        <span className="truncate">More</span>
      </button>
    </nav>,
    document.body,
  );
}

const fabActions: NavItem[] = [
  { to: "/onboarding/booking", label: "New booking", icon: Receipt },
  { to: "/onboarding/customer", label: "New customer", icon: UserPlus },
  { to: "/onboarding/visit", label: "Site visit", icon: CalendarClock },
  { to: "/onboarding/reservation", label: "New reservation", icon: Clock },
  { to: "/onboarding/project", label: "New project", icon: FolderPlus },
  { to: "/onboarding/agent", label: "New agent", icon: BadgePlus },
];

/** Pages that already have Save / Continue / Create — the + button must not cover them. */
function hideCreateFab(pathname: string) {
  return (
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/site-visits/new") ||
    pathname.startsWith("/plots/editor")
  );
}

function MobileFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const formOpen = useCreateFabBlocked();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || hideCreateFab(pathname) || formOpen) return null;

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Dismiss create menu"
          className="fixed inset-0 z-[1000] bg-foreground/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className="mobile-fab flex flex-col items-end gap-2 lg:hidden"
        style={{
          position: "fixed",
          right: 16,
          bottom: "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px) + 16px)",
          zIndex: 1001,
          transform: "none",
        }}
      >
        {open && (
          <div className="rise flex w-48 flex-col gap-1.5 rounded-2xl bg-surface-lowest p-2 shadow-float">
            {fabActions.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors active:bg-surface-c"
              >
                <item.icon className="h-4 w-4 text-primary" strokeWidth={1.9} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-label={open ? "Close create menu" : "Create"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-float transition-transform active:scale-95",
            open ? "bg-surface-c text-foreground" : "gradient-primary text-primary-foreground",
          )}
        >
          {open ? <X className="h-6 w-6" strokeWidth={2.2} /> : <Plus className="h-7 w-7" strokeWidth={2.4} />}
        </button>
      </div>
    </>,
    document.body,
  );
}

export function AppShell({
  children,
  bleed,
  hideFab,
}: {
  children: ReactNode;
  bleed?: boolean;
  hideFab?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    // Mobile: lock the shell to the dynamic viewport (see .app-shell CSS) and scroll
    // only `.app-shell-main` so the portaled bottom tab bar stays pinned.
    <div className="app-shell flex max-w-full min-w-0 bg-background">
      <Sidebar />
      <MobileMenu open={open} onClose={() => setOpen(false)} />
      <div className="app-shell-column flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          className={cn(
            "app-shell-main min-w-0 flex-1 lg:overflow-visible lg:pb-12",
            bleed
              ? "pt-[env(safe-area-inset-top)] lg:pt-0 lg:pb-0"
              : "px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 lg:pt-2",
          )}
        >
          {children}
        </main>
      </div>
      {hideFab || open ? null : <MobileFab />}
      <BottomTabs onMore={() => setOpen((v) => !v)} menuOpen={open} />
    </div>
  );
}
