"use client";

import { useTransition } from "react";
import { toggleProjectActive } from "@/app/admin/projects/actions";
import { cn } from "@/lib/utils";

export function ProjectActiveToggle({
  projectId,
  active,
}: {
  projectId: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 select-none",
        pending && "opacity-60",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-semibold text-muted-foreground">{active ? "Active" : "Inactive"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Set inactive" : "Set active"}
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await toggleProjectActive(projectId, !active);
          });
        }}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          active ? "bg-emerald-500" : "bg-[var(--surface-high)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            active && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
