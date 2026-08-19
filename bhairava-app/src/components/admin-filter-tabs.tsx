import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminFilterTab = {
  key: string;
  label: string;
  href: string;
  count?: number;
};

/**
 * Segmented filter control for admin list pages.
 * Selected tab is always white text on brand blue (see .filter-tab-active in globals.css).
 */
export function AdminFilterTabs({
  tabs,
  activeKey,
  className,
}: {
  tabs: AdminFilterTab[];
  activeKey: string;
  className?: string;
}) {
  return (
    <div className={cn("filter-tabs", className)} role="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={selected}
            className={cn("filter-tab", selected && "filter-tab-active")}
          >
            {tab.label}
            {tab.count != null ? (
              <span className="filter-tab-count">{tab.count}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
