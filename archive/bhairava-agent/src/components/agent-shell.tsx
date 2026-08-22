"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Building2,
  CalendarCheck2,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Building2 },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/more", label: "More", icon: Menu },
];

export function AgentShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  void name;

  return (
    <div className="mobile-shell">
      <div className="mobile-main">{children}</div>
      <nav className="bottom-nav" aria-label="Agent">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative flex flex-col items-center gap-0.5">
                {active && !reduce ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute -inset-x-3 -top-1 -bottom-0.5 rounded-2xl bg-[var(--brand-light)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <Icon size={20} strokeWidth={active ? 2.4 : 2} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
