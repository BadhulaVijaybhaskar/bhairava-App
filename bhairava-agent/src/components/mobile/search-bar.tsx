"use client";

import { Filter, Search } from "lucide-react";

export function SearchBar({
  name = "q",
  defaultValue = "",
  placeholder = "Search",
  onFilterClick,
  showFilter = false,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
}) {
  return (
    <div className="mb-3 flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="m-input !h-11 !pl-9"
        />
      </div>
      {showFilter ? (
        <button
          type="button"
          onClick={onFilterClick}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-strong)] bg-white text-muted-foreground"
          aria-label="Filter"
        >
          <Filter size={18} />
        </button>
      ) : null}
    </div>
  );
}
