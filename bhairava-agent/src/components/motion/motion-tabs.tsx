"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function MotionTabs({
  tabs,
  active,
  basePath,
  preserve,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  basePath: string;
  preserve?: Record<string, string | undefined>;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mb-3 -mx-1 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const isActive =
          active.toUpperCase() === t.key.toUpperCase() ||
          (t.key === "All" && active.toUpperCase() === "ALL");
        const params = new URLSearchParams();
        if (t.key !== "All") params.set("tab", t.key);
        if (preserve) {
          for (const [k, v] of Object.entries(preserve)) {
            if (v) params.set(k, v);
          }
        }
        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        return (
          <Link
            key={t.key}
            href={href}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && !reduce ? (
              <motion.span
                layoutId="agent-tab-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            ) : isActive ? (
              <span className="absolute inset-0 rounded-full bg-primary" />
            ) : null}
            <span className="relative z-10">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
