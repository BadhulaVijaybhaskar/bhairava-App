import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, ScrollText, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/settings/users", label: "Members & roles", icon: Shield },
  { to: "/settings/audit", label: "Audit logs", icon: ScrollText },
  { to: "/settings/company", label: "Company", icon: Building2 },
];

export function SettingsNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="-mx-1 flex w-full shrink-0 gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:w-52 lg:flex-col lg:space-y-0.5 lg:px-0 lg:pb-0">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-surface-low font-medium text-foreground shadow-ambient"
                : "text-muted-foreground hover:bg-surface-low hover:text-foreground",
            )}

          >
            <item.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.9} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
