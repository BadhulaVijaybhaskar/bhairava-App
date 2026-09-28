import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { userFacingError } from "@bhairava/api-client";
import { cn } from "../lib/utils";
import { btnClasses } from "./kit";

export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  action,
  compact,
  className,
}: {
  title?: ReactNode;
  /** Shown instead of the error's message when provided. */
  description?: ReactNode;
  error?: unknown;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const detail = description ?? (error != null ? userFacingError(error) : undefined);
  return (
    <div
      role="alert"
      className={cn(
        "panel rise flex flex-col items-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14 sm:py-16",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-2xl bg-destructive/10 text-destructive",
          compact ? "h-10 w-10" : "h-12 w-12",
        )}
      >
        <AlertTriangle className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={1.9} />
      </span>
      <div className="max-w-sm">
        <p className="font-display text-base font-semibold tracking-[-0.02em]">{title}</p>
        {detail && (
          <p className="pt-1 text-sm leading-relaxed break-words text-muted-foreground text-pretty">{detail}</p>
        )}
      </div>
      {(onRetry || action) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className={btnClasses("tonal")}>
              <RotateCw className="h-4 w-4" />
              {retryLabel}
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
