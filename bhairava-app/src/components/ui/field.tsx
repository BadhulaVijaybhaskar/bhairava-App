import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-label">
          {label}
          {required ? (
            <span className="ml-0.5 text-[11px] font-bold text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {hint ? <span className="text-[10px] font-medium text-muted">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
