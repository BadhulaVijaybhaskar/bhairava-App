import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable horizontally-swipeable tab row for mobile.
 * - hides the scrollbar, never wraps/shrinks items
 * - scrolls the active item (marked with data-active="true") into view
 * Pass responsive overrides via `className` (e.g. lg:flex-col for a desktop sidebar).
 */
export function ScrollTabs({
  children,
  className,
  activeKey,
}: {
  children: ReactNode;
  className?: string | undefined;
  activeKey?: string | number | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activeKey]);

  return (
    <div
      ref={ref}
      className={cn(
        "no-scrollbar flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  );
}
