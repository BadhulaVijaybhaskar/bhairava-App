"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPinned,
  UsersRound,
  CalendarCheck2,
  Wallet,
  Handshake,
  FolderOpen,
  BadgeCheck,
  ArrowLeftRight,
  ChartColumnIncreasing,
  UserRound,
  Settings2,
  ScrollText,
  Bell,
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { AdminCommandPalette } from "@/components/admin-command-palette";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageEnter } from "@/components/motion/fade-in";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Inventory",
    items: [
      { href: "/admin/projects", label: "Projects", icon: Building2 },
      { href: "/admin/plots", label: "Plots", icon: MapPinned },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/customers", label: "Customers", icon: UsersRound },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2 },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/registrations", label: "Registrations", icon: BadgeCheck },
      { href: "/admin/resale", label: "Resale", icon: ArrowLeftRight },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/agents", label: "Agents", icon: Handshake },
      { href: "/admin/users", label: "Users", icon: UserRound },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/documents", label: "Documents", icon: FolderOpen },
      { href: "/admin/reports", label: "Reports", icon: ChartColumnIncreasing },
      { href: "/admin/settings", label: "Settings", icon: Settings2 },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

const flatNav = navGroups.flatMap((g) => g.items);

const bottomNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/admin/projects", label: "Projects", icon: Building2 },
  { href: "/admin/plots", label: "Plots", icon: MapPinned },
  { href: "/admin/customers", label: "Customers", icon: UsersRound },
];

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center transition",
        active ? "text-[#173B5E]" : "text-[#6E7D8E]",
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} absoluteStrokeWidth />
    </span>
  );
}

function SidebarLink({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={!expanded ? item.label : undefined}
      className={cn(
        "relative flex items-center text-[13px] font-medium transition rounded-lg",
        expanded ? "gap-2.5 px-2 py-1" : "justify-center px-1.5 py-1",
        active
          ? "bg-[#EFF4F8] text-[#173B5E]"
          : "text-[#6E7D8E] hover:text-[#132238] hover:bg-[#EFF4F8]",
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
      ) : null}
      <NavIcon icon={item.icon} active={active} />
      {expanded ? (
        <span className={cn("relative z-10 truncate", active ? "font-semibold text-primary" : undefined)}>
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const crumb =
    flatNav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label ??
    "Admin";

  function renderNav(expanded: boolean, onNavigate?: () => void) {
    return (
      <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2.5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {expanded ? (
              <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7D8E]">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={active}
                    expanded={expanded}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar — white */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-white transition-[width] duration-300 ease-out lg:flex",
          hovered ? "w-[240px]" : "w-[72px]",
        )}
      >
        <div className="px-2.5 py-3">
          <div
            className={cn(
              "flex w-full items-center px-1.5 py-1.5",
              hovered ? "gap-3 px-2" : "justify-center",
            )}
          >
            <Image
              src="/branding/bhairava-logo.png"
              alt="Bhairava"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              priority
            />
            {hovered ? (
              <p className="font-display min-w-0 flex-1 truncate text-left text-lg font-semibold text-foreground">
                Bhairava
              </p>
            ) : null}
          </div>
        </div>

        {renderNav(hovered)}

        <div className="p-2.5">
          <button
            type="button"
            onClick={logout}
            className={cn(
              "flex w-full items-center px-2 py-1 text-[13px] font-semibold text-red-500 hover:text-red-600 hover:bg-[#EFF4F8] rounded-lg",
              !hovered && "justify-center",
            )}
            title="Logout"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            {hovered ? <span className="ml-1 truncate">Logout</span> : null}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] bg-white p-0 sm:max-w-[280px]">
          <SheetHeader className="px-3 py-3 text-left">
            <SheetTitle className="flex items-center gap-2.5">
              <Image
                src="/branding/bhairava-logo.png"
                alt="Bhairava"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="font-display text-lg font-semibold text-foreground">Bhairava</span>
            </SheetTitle>
          </SheetHeader>
          {renderNav(true, () => setMobileOpen(false))}
          <div className="p-3">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-red-500 hover:text-red-600 hover:bg-[#EFF4F8]"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[72px]">
        {/* Top bar — glass */}
        <header className="glass sticky top-0 z-30">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-foreground lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-[13px] font-semibold text-foreground">{crumb}</p>
                <p className="text-[11px] text-muted-foreground">Operations</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <AdminCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-foreground md:hidden"
                onClick={() => setCmdOpen(true)}
                aria-label="Search"
              >
                <Search className="size-4" />
              </Button>
              <Link
                href="/admin/notifications"
                className="relative inline-flex size-9 items-center justify-center rounded-lg text-[#6E7D8E] transition hover:bg-[#EFF4F8]"
                aria-label="Notifications"
              >
                <Bell className="size-4" strokeWidth={2} />
              </Link>
              <div className="flex items-center gap-2 rounded-lg bg-[#EFF4F8] py-1 pl-1 pr-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-white">
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[13px] font-semibold leading-none text-foreground">
                    {userName}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                    Administrator
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 pb-24 lg:p-8 lg:pb-10">
          <PageEnter key={pathname}>{children}</PageEnter>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 glass lg:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
            {bottomNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition",
                    active ? "text-[#173B5E]" : "text-[#6E7D8E]",
                  )}
                >
                  {active && !reduce ? (
                    <motion.span
                      layoutId="admin-bottom-pill"
                      className="absolute inset-x-2 top-1 h-8 rounded-lg bg-primary/8"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 items-center justify-center rounded-lg",
                      active ? "bg-primary text-white" : "bg-transparent",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4", active ? "text-white" : "text-primary")}
                      strokeWidth={2}
                    />
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold text-[#6E7D8E]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg">
                <Menu className="h-4 w-4 text-primary" strokeWidth={2} />
              </span>
              More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
