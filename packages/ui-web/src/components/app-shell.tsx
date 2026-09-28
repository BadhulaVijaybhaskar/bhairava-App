import { Bell, ChevronDown, LogOut, Menu, Plus, Search, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { FabVisibilityProvider, useCreateFabBlocked } from "../lib/fab-visibility";
import { useEscapeKey, useMounted } from "../lib/overlay";
import { cn } from "../lib/utils";
import { BrandLogo } from "./brand";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only active on an exact path match (`/` is always exact). */
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Mobile More sheet: sit half-width next to another paired group (≥ 480px). */
  pair?: boolean;
}

export interface AppShellUser {
  name: string;
  email?: string;
}

export interface AppShellProps {
  /** Sidebar (desktop) and More sheet (mobile) navigation. */
  navGroups: NavGroup[];
  /** Shortcut tiles at the top of the mobile More sheet; default FAB actions. */
  quickActions?: NavItem[] | undefined;
  /** Mobile bottom tabs (a "More" tab is appended). Defaults to the first four nav items. */
  tabItems?: NavItem[] | undefined;
  /** Mobile create (+) menu. Defaults to `quickActions`. */
  fabActions?: NavItem[] | undefined;
  /** Desktop top-bar call to action, e.g. `{ to: "/bookings/new", label: "New booking", icon: Plus }`. */
  primaryAction?: NavItem | undefined;
  brandTitle?: string | undefined;
  brandSubtitle?: string | undefined;
  logoSrc?: string | undefined;
  homeTo?: string | undefined;
  user?: AppShellUser | null | undefined;
  onSignOut: () => void;
  /** Unread count; shows a dot on the bell when > 0. */
  notificationCount?: number | undefined;
  /** Bell destination. The bell is hidden when omitted. */
  notificationsTo?: string | undefined;
  /** Enables the desktop top-bar search; called on submit. */
  onSearch?: ((query: string) => void) | undefined;
  searchPlaceholder?: string | undefined;
  /** Extra desktop top-bar content (before the bell). */
  topbarRight?: ReactNode | undefined;
  /** Hide the mobile create (+) on routes that already have primary actions. */
  hideFabOn?: ((pathname: string) => boolean) | undefined;
  children: ReactNode;
  /** Edge-to-edge content (no page padding), e.g. map/canvas screens. */
  bleed?: boolean | undefined;
  hideFab?: boolean | undefined;
}

function matchesPath(pathname: string, item: NavItem) {
  if (item.end || item.to === "/") return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to.replace(/\/$/, "")}/`);
}

/** Longest matching `to` in a list, so `/plots/layout` wins over `/plots` within the same menu. */
function bestMatch(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    if (matchesPath(pathname, item) && (!best || item.to.length > best.length)) best = item.to;
  }
  return best;
}

function matchesQuery(label: string, query: string) {
  return !query || label.toLowerCase().includes(query);
}

interface BrandProps {
  brandTitle: string;
  brandSubtitle: string;
  logoSrc?: string | undefined;
  homeTo: string;
}

function BrandMark({ brandTitle, brandSubtitle, logoSrc, homeTo }: BrandProps) {
  return (
    <Link to={homeTo} className="flex min-w-0 items-center gap-3">
      <BrandLogo size={38} logoSrc={logoSrc} alt={brandTitle} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display text-base font-semibold tracking-tight">
          {brandTitle}
        </span>
        {brandSubtitle && (
          <span className="block truncate text-[11px] tracking-wide text-muted-foreground">
            {brandSubtitle}
          </span>
        )}
      </span>
    </Link>
  );
}

function NavList({ navGroups, onNavigate }: { navGroups: NavGroup[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = useMemo(
    () => bestMatch(pathname, navGroups.flatMap((g) => g.items)),
    [pathname, navGroups],
  );
  return (
    <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto pr-1">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.to === active;
              return (
                <Link
                  key={item.to + item.label}
                  to={item.to}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors lg:py-2",
                    isActive
                      ? "bg-brand-selected font-medium text-foreground shadow-ambient"
                      : "text-muted-foreground hover:bg-surface-c hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
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

function SignOutButton({ onSignOut, className }: { onSignOut: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-c px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-high active:bg-surface-highest",
        className,
      )}
    >
      <LogOut className="h-4 w-4 text-primary" strokeWidth={2} />
      Sign out
    </button>
  );
}

function UserCard({ user, onSignOut }: { user?: AppShellUser | null | undefined; onSignOut: () => void }) {
  return (
    <div className="shrink-0 rounded-xl bg-surface-c px-3 py-3">
      {user && (
        <>
          <p className="truncate text-xs font-medium">{user.name}</p>
          {user.email && <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>}
        </>
      )}
      <SignOutButton onSignOut={onSignOut} className={cn("w-full", user && "mt-2")} />
    </div>
  );
}

function Sidebar({
  navGroups,
  user,
  onSignOut,
  brand,
}: {
  navGroups: NavGroup[];
  user?: AppShellUser | null | undefined;
  onSignOut: () => void;
  brand: BrandProps;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-surface-low px-4 pt-6 pb-6 lg:flex">
      <div className="mb-6 shrink-0 px-2">
        <BrandMark {...brand} />
      </div>
      <NavList navGroups={navGroups} />
      <div className="mt-4 shrink-0">
        <UserCard user={user} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}

function MobileMenu({
  open,
  onClose,
  navGroups,
  quickActions,
  onSignOut,
  brand,
}: {
  open: boolean;
  onClose: () => void;
  navGroups: NavGroup[];
  quickActions: NavItem[];
  onSignOut: () => void;
  brand: BrandProps;
}) {
  const { pathname } = useLocation();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEscapeKey(open, onClose);

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
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      html.classList.remove("more-menu-open");
      if (main instanceof HTMLElement) main.style.overflow = prevMain;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleQuick = useMemo(
    () => quickActions.filter((item) => matchesQuery(item.label, normalizedQuery)),
    [quickActions, normalizedQuery],
  );
  const visibleSections = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matchesQuery(item.label, normalizedQuery)),
        }))
        .filter((group) => group.items.length > 0),
    [navGroups, normalizedQuery],
  );
  const activeQuick = bestMatch(pathname, quickActions);
  const activeNav = bestMatch(pathname, navGroups.flatMap((g) => g.items));
  const hasResults = visibleQuick.length > 0 || visibleSections.length > 0;

  if (!open || !mounted) return null;

  return createPortal(
    <div className="mobile-more-overlay lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
      />
      <div className="mobile-more-sheet">
        <header className="mobile-more-header">
          <div className="mobile-more-handle" aria-hidden="true" />
          <div className="mobile-more-brand-row">
            <Link to={brand.homeTo} onClick={onClose} className="mobile-more-brand">
              <BrandLogo size={32} logoSrc={brand.logoSrc} alt={brand.brandTitle} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-display text-[15px] font-semibold tracking-tight">
                  {brand.brandTitle}
                </span>
                {brand.brandSubtitle && (
                  <span className="block truncate text-[10px] tracking-wide text-muted-foreground">
                    {brand.brandSubtitle}
                  </span>
                )}
              </span>
            </Link>
            <button type="button" onClick={onClose} aria-label="Close menu" className="mobile-more-close">
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
                aria-label="Search menu"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="mobile-more-signout"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.1} />
              Sign out
            </button>
          </div>

          {visibleQuick.length > 0 ? (
            <section className="mobile-more-quick-wrap">
              <p className="mobile-more-kicker">Quick actions</p>
              <div className="mobile-more-quick">
                {visibleQuick.map((item) => {
                  const isActive = item.to === activeQuick;
                  return (
                    <Link
                      key={item.to + item.label}
                      to={item.to}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={cn("mobile-more-quick-tile", isActive && "is-active")}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.1 : 1.8} />
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
                    data-span={group.pair ? "false" : "true"}
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
                            const isActive = item.to === activeNav;
                            return (
                              <Link
                                key={item.to + item.label}
                                to={item.to}
                                onClick={onClose}
                                tabIndex={expanded ? undefined : -1}
                                aria-current={isActive ? "page" : undefined}
                                className={cn("mobile-more-tile", isActive && "is-active")}
                              >
                                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.1 : 1.75} />
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

function TopBar({
  primaryAction,
  notificationCount = 0,
  notificationsTo,
  onSearch,
  searchPlaceholder,
  topbarRight,
}: Pick<
  AppShellProps,
  "primaryAction" | "notificationCount" | "notificationsTo" | "onSearch" | "searchPlaceholder" | "topbarRight"
>) {
  const [query, setQuery] = useState("");
  return (
    <header className="glass sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-4 px-6 pt-[env(safe-area-inset-top)] lg:flex">
      {onSearch && (
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch(query.trim());
          }}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-low px-3 transition-shadow duration-200 focus-within:shadow-glow md:max-w-md"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder ?? "Search…"}
            aria-label={searchPlaceholder ?? "Search"}
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </form>
      )}
      <div className="flex-1" />
      {topbarRight}
      {primaryAction && (
        <Link
          to={primaryAction.to}
          className="gradient-primary flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground shadow-ambient transition-shadow hover:shadow-glow"
        >
          <primaryAction.icon className="h-4 w-4" /> {primaryAction.label}
        </Link>
      )}
      {notificationsTo && (
        <Link
          to={notificationsTo}
          aria-label={
            notificationCount > 0 ? `Notifications (${notificationCount} unread)` : "Notifications"
          }
          className="relative shrink-0 rounded-lg bg-surface-low p-2 transition-colors hover:bg-surface-c"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span
              aria-hidden
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary-luminous ring-2 ring-surface-low"
            />
          )}
        </Link>
      )}
    </header>
  );
}

function BottomTabs({
  tabItems,
  onMore,
  menuOpen,
}: {
  tabItems: NavItem[];
  onMore: () => void;
  menuOpen: boolean;
}) {
  const { pathname } = useLocation();
  const mounted = useMounted();
  const active = bestMatch(pathname, tabItems);

  if (!mounted) return null;

  return createPortal(
    <nav
      className="mobile-bottom-nav grid gap-1 px-2 pt-1.5 lg:hidden"
      aria-label="Primary"
      style={{
        gridTemplateColumns: `repeat(${tabItems.length + 1}, minmax(0, 1fr))`,
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
        const isActive = !menuOpen && item.to === active;
        return (
          <Link
            key={item.to + item.label}
            to={item.to}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-label="More"
        aria-expanded={menuOpen}
        className={cn(
          "flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-medium transition-colors",
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

function MobileFab({
  actions,
  hideFabOn,
}: {
  actions: NavItem[];
  hideFabOn?: ((pathname: string) => boolean) | undefined;
}) {
  const { pathname } = useLocation();
  const formOpen = useCreateFabBlocked();
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  useEscapeKey(open, () => setOpen(false));

  useEffect(() => setOpen(false), [pathname]);

  if (!mounted || actions.length === 0 || hideFabOn?.(pathname) || formOpen) return null;

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          aria-label="Dismiss create menu"
          tabIndex={-1}
          className="fade-in fixed inset-0 z-[1000] bg-foreground/20 lg:hidden"
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
          <div className="rise flex w-52 flex-col gap-1.5 rounded-2xl bg-surface-lowest p-2 shadow-float">
            {actions.map((item) => (
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

/**
 * Responsive application frame: desktop sidebar + glass top bar; mobile bottom
 * tabs, More sheet and create (+) FAB. Requires a react-router context.
 *
 * Mobile: the shell is locked to the dynamic viewport (see `.app-shell` CSS)
 * and only `.app-shell-main` scrolls, so the portaled tab bar stays pinned.
 */
export function AppShell({
  navGroups,
  quickActions = [],
  tabItems,
  fabActions,
  primaryAction,
  brandTitle = "Bhairava",
  brandSubtitle = "Land Sales OS",
  logoSrc,
  homeTo = "/",
  user,
  onSignOut,
  notificationCount,
  notificationsTo,
  onSearch,
  searchPlaceholder,
  topbarRight,
  hideFabOn,
  children,
  bleed,
  hideFab,
}: AppShellProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const brand: BrandProps = { brandTitle, brandSubtitle, logoSrc, homeTo };
  const tabs = useMemo(
    () => tabItems ?? navGroups.flatMap((g) => g.items).slice(0, 4),
    [tabItems, navGroups],
  );

  useEffect(() => setOpen(false), [pathname]);

  return (
    <FabVisibilityProvider>
      <div className="app-shell flex max-w-full min-w-0 bg-background">
        <a
          href="#app-main"
          className="sr-only z-[1300] rounded-lg bg-surface-lowest px-3 py-2 text-sm font-medium shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Sidebar navGroups={navGroups} user={user} onSignOut={onSignOut} brand={brand} />
        <MobileMenu
          open={open}
          onClose={() => setOpen(false)}
          navGroups={navGroups}
          quickActions={quickActions}
          onSignOut={onSignOut}
          brand={brand}
        />
        <div className="app-shell-column flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar
            primaryAction={primaryAction}
            notificationCount={notificationCount}
            notificationsTo={notificationsTo}
            onSearch={onSearch}
            searchPlaceholder={searchPlaceholder}
            topbarRight={topbarRight}
          />
          <main
            id="app-main"
            tabIndex={-1}
            className={cn(
              "app-shell-main min-w-0 flex-1 outline-none lg:overflow-visible lg:pb-12",
              bleed
                ? "pt-[env(safe-area-inset-top)] lg:pt-0 lg:pb-0"
                : "px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 lg:pt-2",
            )}
          >
            {children}
          </main>
        </div>
        {hideFab || open ? null : (
          <MobileFab actions={fabActions ?? quickActions} hideFabOn={hideFabOn} />
        )}
        <BottomTabs tabItems={tabs} onMore={() => setOpen((v) => !v)} menuOpen={open} />
      </div>
    </FabVisibilityProvider>
  );
}
