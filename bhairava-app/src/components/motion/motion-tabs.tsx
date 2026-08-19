"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type MotionTab = {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
};

export function MotionTabs({
  tabs,
  layoutId = "admin-tab-pill",
  className,
}: {
  tabs: MotionTab[];
  layoutId?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            "relative rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
            tab.active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.active && (
            <motion.span
              layoutId={reduce ? undefined : layoutId}
              className="absolute inset-0 rounded-md bg-primary"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1.5">
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "text-[11px] font-medium",
                  tab.active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
