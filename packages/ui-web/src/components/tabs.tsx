import type { LucideIcon } from "lucide-react";
import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/utils";
import { ScrollTabs } from "./scroll-tabs";

export interface TabItem<K extends string = string> {
  key: K;
  label: ReactNode;
  icon?: LucideIcon;
  /** Small numeric badge (e.g. record count). */
  count?: number;
  disabled?: boolean;
}

/**
 * Controlled, horizontally-swipeable tab row (ScrollTabs) in the MAIN segmented
 * style. `pill` sits on a tonal track; `underline` is for record sub-navigation.
 * Pair with `TabPanel` using the same `idBase` for ARIA wiring.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  variant = "pill",
  className,
  idBase,
  "aria-label": ariaLabel,
}: {
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: "pill" | "underline";
  className?: string;
  idBase?: string;
  "aria-label"?: string;
}) {
  const generated = useId();
  const base = idBase ?? generated;
  const enabled = items.filter((i) => !i.disabled);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = enabled.findIndex((i) => i.key === value);
    if (index < 0 || enabled.length === 0) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.key);
    event.currentTarget
      .querySelector<HTMLElement>(`[data-tab-key="${CSS.escape(next.key)}"]`)
      ?.focus();
  };

  return (
    <ScrollTabs
      role="tablist"
      aria-label={ariaLabel}
      activeKey={value}
      onKeyDown={onKeyDown}
      className={cn(
        variant === "pill"
          ? "rounded-xl bg-surface-low p-1"
          : "gap-4 shadow-[inset_0_-1px_0_color-mix(in_oklab,var(--outline-variant)_35%,transparent)]",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`${base}-tab-${item.key}`}
            aria-controls={`${base}-panel-${item.key}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            data-active={active ? "true" : undefined}
            data-tab-key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "inline-flex flex-none items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
              variant === "pill"
                ? cn(
                    "rounded-lg px-3 py-2 md:py-1.5",
                    active
                      ? "bg-surface-lowest text-foreground shadow-ambient"
                      : "text-muted-foreground hover:bg-surface-c hover:text-foreground",
                  )
                : cn(
                    "relative px-0.5 pt-1 pb-3 text-sm",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:transition-colors",
                    active
                      ? "text-foreground after:bg-primary"
                      : "text-muted-foreground after:bg-transparent hover:text-foreground",
                  ),
            )}
          >
            {Icon && (
              <Icon
                aria-hidden
                className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
                strokeWidth={2}
              />
            )}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  "numeric rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-primary/10 text-primary" : "bg-surface-c text-muted-foreground",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </ScrollTabs>
  );
}

export function TabPanel({
  idBase,
  tabKey,
  active,
  children,
  className,
}: {
  idBase: string;
  tabKey: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${tabKey}`}
      aria-labelledby={`${idBase}-tab-${tabKey}`}
      className={cn("rise pt-4", className)}
    >
      {children}
    </div>
  );
}
