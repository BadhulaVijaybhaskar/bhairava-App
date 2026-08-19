"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPinned,
  Menu,
} from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/my-plot", label: "My Plot", icon: MapPinned },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/more", label: "More", icon: Menu },
];

export function CustomerShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  void name;
  void router;

  return (
    <div className="mobile-shell">
      <div className="mobile-main">{children}</div>
      <nav className="bottom-nav" aria-label="Customer">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
              <Icon size={20} strokeWidth={2.1} />
              <span>{item.label}</span>
              {active ? <span className="nav-dot" /> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
