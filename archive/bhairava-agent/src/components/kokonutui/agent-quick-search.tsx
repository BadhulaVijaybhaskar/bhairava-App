"use client";

/**
 * Agent quick actions — Kokonut Action Search Bar pattern,
 * wired to real Agent destinations (not demo AI actions).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  CalendarCheck2,
  FileText,
  LayoutDashboard,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import useDebounce from "@/hooks/use-debounce";

const ACTIONS = [
  {
    id: "dashboard",
    label: "Go to Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    end: "Nav",
  },
  {
    id: "projects",
    label: "Browse Projects",
    href: "/projects",
    icon: Building2,
    end: "Sales",
  },
  {
    id: "bookings",
    label: "My Bookings",
    href: "/bookings",
    icon: CalendarCheck2,
    end: "Sales",
  },
  {
    id: "customers",
    label: "Customers",
    href: "/customers",
    icon: Users,
    end: "CRM",
  },
  {
    id: "new-customer",
    label: "Add Customer",
    href: "/customers/new",
    icon: UserPlus,
    end: "CRM",
  },
  {
    id: "documents",
    label: "Documents",
    href: "/documents",
    icon: FileText,
    end: "Docs",
  },
];

export function AgentQuickSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 180);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.end.toLowerCase().includes(q),
    );
  }, [debounced]);

  return (
    <div className="relative mb-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Quick actions…"
          className="h-11 bg-white pl-9 shadow-sm"
        />
      </div>

      <AnimatePresence>
        {open && results.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
          >
            <ul className="max-h-56 overflow-auto py-1">
              {results.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-secondary"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        router.push(a.href);
                      }}
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Icon size={15} />
                      </span>
                      <span className="flex-1 text-[13px] font-medium">{a.label}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {a.end}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
