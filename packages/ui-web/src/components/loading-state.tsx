import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("h-5 w-5 animate-spin text-primary", className)}
      strokeWidth={2.2}
    />
  );
}

/** Tonal placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-lg bg-surface-c", className)} />;
}

/**
 * Loading placeholder.
 * - `spinner` (default): centered spinner + label
 * - `rows`: skeleton list rows (tables, feeds)
 * - `metrics`: skeleton metric cards
 */
export function LoadingState({
  label = "Loading…",
  variant = "spinner",
  rows = 5,
  className,
}: {
  label?: ReactNode;
  variant?: "spinner" | "rows" | "metrics";
  rows?: number;
  className?: string;
}) {
  if (variant === "rows") {
    return (
      <div role="status" aria-busy="true" className={cn("panel space-y-3 p-4 sm:p-6", className)}>
        <span className="sr-only">{label}</span>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-3/5 opacity-70" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "metrics") {
    return (
      <div role="status" aria-busy="true" className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
        <span className="sr-only">{label}</span>
        {Array.from({ length: rows > 0 ? Math.min(rows, 8) : 4 }, (_, i) => (
          <div key={i} className="panel space-y-3 p-3.5 sm:p-5">
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-2.5 w-1/3 opacity-70" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-lowest shadow-ambient">
        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-primary" strokeWidth={2.2} />
      </span>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
