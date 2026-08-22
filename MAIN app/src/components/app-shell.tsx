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
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { notifications } from "@/lib/mock-data";
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

function UserCard() {
  return (
    <div className="mt-6 rounded-xl bg-surface-c px-3 py-3">
      <p className="text-xs font-medium">Vijay Bhaskar</p>
      <p className="text-[11px] text-muted-foreground">Founder · Astranova</p>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-surface-low px-4 pt-6 pb-8 lg:flex">
      <div className="mb-8 px-2">
        <BrandMark />
      </div>
      <NavList />
      <UserCard />
    </aside>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/35 backdrop-blur-[2px]"
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[86svh] overflow-y-auto rounded-t-3xl bg-surface-low pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float">
        <div className="sticky top-0 z-10 bg-surface-low px-5 pt-3 pb-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-c" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <BrandMark />
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="shrink-0 rounded-full bg-surface-c p-2.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 pt-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {group.label}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn(
                        "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 text-center transition-colors",
                        active
                          ? "bg-surface-lowest shadow-ambient"
                          : "bg-surface-c/60 active:bg-surface-c",
                      )}
                    >
                      <item.icon
                        className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")}
                        strokeWidth={active ? 2.1 : 1.8}
                      />
                      <span
                        className={cn(
                          "line-clamp-2 text-[10px] leading-tight font-medium",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <UserCard />
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const unread = notifications.filter((n) => n.unread).length;
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-outline-variant/25 bg-surface-lowest px-4 pt-[env(safe-area-inset-top)] sm:gap-4 sm:px-6">
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

function MobileFab() {
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

  if (!mounted) return null;

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

export function AppShell({ children, bleed }: { children: ReactNode; bleed?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell flex bg-background">
      <Sidebar />
      <MobileMenu open={open} onClose={() => setOpen(false)} />
      <div className="app-shell-column flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          className={cn(
            "app-shell-main min-w-0 flex-1 lg:overflow-visible lg:pb-12",
            bleed ? "lg:pb-0" : "px-4 pt-2 sm:px-6",
          )}
        >
          {children}
        </main>
      </div>
      <MobileFab />
      <BottomTabs onMore={() => setOpen((v) => !v)} menuOpen={open} />
    </div>
  );
}
