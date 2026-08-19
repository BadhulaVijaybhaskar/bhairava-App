"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
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
  Plus,
  Search,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

type CmdItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: string;
  keywords?: string;
};

const COMMANDS: CmdItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navigate" },
  { href: "/admin/projects", label: "Projects", icon: Building2, group: "Navigate" },
  { href: "/admin/plots", label: "Plots", icon: MapPinned, group: "Navigate" },
  { href: "/admin/customers", label: "Customers", icon: UsersRound, group: "Navigate" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2, group: "Navigate" },
  { href: "/admin/payments", label: "Payments", icon: Wallet, group: "Navigate" },
  { href: "/admin/agents", label: "Agents", icon: Handshake, group: "Navigate" },
  { href: "/admin/documents", label: "Documents", icon: FolderOpen, group: "Navigate" },
  { href: "/admin/registrations", label: "Registrations", icon: BadgeCheck, group: "Navigate" },
  { href: "/admin/resale", label: "Resale", icon: ArrowLeftRight, group: "Navigate" },
  { href: "/admin/reports", label: "Reports", icon: ChartColumnIncreasing, group: "Navigate" },
  { href: "/admin/users", label: "Users", icon: UserRound, group: "Navigate" },
  { href: "/admin/settings", label: "Settings", icon: Settings2, group: "Navigate" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText, group: "Navigate" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, group: "Navigate" },
  {
    href: "/admin/bookings/new",
    label: "Create booking",
    icon: Plus,
    group: "Actions",
    keywords: "new sell plot",
  },
  {
    href: "/admin/customers/new",
    label: "Add customer",
    icon: Plus,
    group: "Actions",
    keywords: "new lead",
  },
  {
    href: "/admin/projects/new",
    label: "New project",
    icon: Plus,
    group: "Actions",
    keywords: "create inventory",
  },
];

export function AdminCommandPalette({
  open: controlledOpen,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  function run(href: string) {
    setOpen(false);
    router.push(href);
  }

  const groups = ["Actions", "Navigate"] as const;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden h-9 gap-2 bg-[var(--surface-container-low)] px-3 text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" />
        <span className="text-[13px]">Search…</span>
        <kbd className="pointer-events-none ml-2 hidden h-5 items-center gap-0.5 rounded bg-[var(--surface-container)] px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(next) => setOpen(Boolean(next))}
      >
        {open ? (
          <>
            <CommandInput placeholder="Jump to a page or action…" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {groups.map((group, i) => (
                <div key={group}>
                  {i > 0 ? <CommandSeparator /> : null}
                  <CommandGroup heading={group}>
                    {COMMANDS.filter((c) => c.group === group).map((item) => {
                      const Icon = item.icon;
                      return (
                        <CommandItem
                          key={item.href + item.label}
                          value={`${item.label} ${item.keywords ?? ""} ${item.group}`}
                          onSelect={() => run(item.href)}
                        >
                          <Icon className="size-4 text-primary" />
                          <span>{item.label}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              ))}
            </CommandList>
          </>
        ) : null}
      </CommandDialog>
    </>
  );
}
