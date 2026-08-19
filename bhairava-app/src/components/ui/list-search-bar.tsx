"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListFilterOption = { key: string; label: string };

export type ListFilterGroup = {
  /** Query param for this group */
  param: string;
  label?: string;
  value: string;
  options: ListFilterOption[];
};

export function ListSearchBar({
  basePath,
  placeholder,
  initialQ = "",
  initialFilter = "",
  filters,
  filterGroups,
}: {
  basePath: string;
  placeholder: string;
  initialQ?: string;
  /** Current value when using simple `filters` (param `filter`). */
  initialFilter?: string;
  /**
   * Single filter group (most list pages). Prefer this or `filterGroups`.
   */
  filters?: ListFilterOption[];
  /** One or more filter groups (status, project, etc.). */
  filterGroups?: ListFilterGroup[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const groups: ListFilterGroup[] =
    filterGroups ??
    (filters
      ? [
          {
            param: "filter",
            value: initialFilter,
            options: filters,
          },
        ]
      : []);

  const filterActive = groups.some((g) => Boolean(g.value));

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function push(next: { q?: string; patch?: Record<string, string> }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextQ = next.q !== undefined ? next.q : q;
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");

    if (next.patch) {
      for (const [key, val] of Object.entries(next.patch)) {
        if (val) params.set(key, val);
        else params.delete(key);
      }
    }

    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${basePath}?${qs}` : basePath);
    });
  }

  return (
    <div className="flex items-center gap-2" ref={panelRef}>
      <form
        className="relative min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q });
        }}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-brand/15"
        />
      </form>

      {groups.length > 0 ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground transition hover:border-primary/40 hover:text-primary",
              (open || filterActive) && "border-primary/40 text-primary",
            )}
            aria-label="Filter"
            title="Filter"
          >
            <Filter className="h-4 w-4" strokeWidth={2} />
          </button>

          {open ? (
            <div className="absolute right-0 z-20 mt-2 max-h-80 w-52 overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-lg">
              {groups.map((group, gi) => (
                <div key={group.param}>
                  {gi > 0 ? <div className="my-1 border-t border-border" /> : null}
                  {group.label ? (
                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                      {group.label}
                    </p>
                  ) : null}
                  {group.options.map((f) => {
                    const active = (group.value || "") === f.key;
                    return (
                      <button
                        key={`${group.param}-${f.key || "all"}`}
                        type="button"
                        className={cn(
                          "flex w-full px-3 py-2 text-left text-sm font-medium transition hover:bg-canvas",
                          active ? "text-primary" : "text-foreground",
                        )}
                        onClick={() => {
                          setOpen(false);
                          push({ patch: { [group.param]: f.key } });
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ListSearchBarFallback() {
  return (
    <div className="flex h-11 gap-2">
      <div className="flex-1 rounded-xl border border-border bg-white" />
      <div className="h-11 w-11 rounded-xl border border-border bg-white" />
    </div>
  );
}
