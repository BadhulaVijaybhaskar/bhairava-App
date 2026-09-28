import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Primary call to action, e.g. a `NewRecordButton`. */
  action?: ReactNode;
  /** Tighter padding for use inside panels and tables. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel-tonal rise flex flex-col items-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14 sm:py-16",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-2xl bg-surface-lowest text-primary shadow-ambient",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.9} />
      </span>
      <div className="max-w-sm">
        <p className="font-display text-base font-semibold tracking-[-0.02em]">{title}</p>
        {description && (
          <p className="pt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center justify-center gap-2 pt-2">{action}</div>}
    </div>
  );
}
