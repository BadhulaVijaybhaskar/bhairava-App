import { ChevronRight, Download, Plus, Search, SlidersHorizontal } from "lucide-react";
import {
  Fragment,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Link, type LinkProps } from "react-router-dom";
import { plotStatusColors, plotStatusFromLabel } from "../lib/plot-status";
import { cn } from "../lib/utils";
import { ScrollTabs } from "./scroll-tabs";

/* -------------------------------- page chrome ------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rise py-3 sm:py-8", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:items-end sm:gap-4">
        <div className="min-w-0 max-w-2xl">
          {/* Eyebrow + long description are desktop-only — mobile is an operational interface. */}
          {eyebrow && (
            <p className="hidden items-center gap-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase sm:flex">
              <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-balance sm:text-[32px] sm:leading-[1.15]">
            {title}
          </h1>
          {description && (
            <p className="hidden max-w-prose pt-2 text-sm leading-relaxed text-muted-foreground text-pretty sm:block">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <span aria-hidden className="hairline-gold mt-3 block h-px w-full opacity-70 sm:mt-6" />
    </div>
  );
}

export function Panel({
  children,
  className,
  tonal,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tonal?: boolean;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">) {
  return (
    <section {...rest} className={cn(tonal ? "panel-tonal" : "panel", "min-w-0 p-4 sm:p-6", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  aside,
  className,
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 pb-4", className)}>
      <h2 className="flex min-w-0 items-center gap-2.5 font-display text-sm font-semibold tracking-tight">
        <span aria-hidden className="gradient-gold h-3.5 w-[3px] shrink-0 rounded-full" />
        <span className="truncate">{children}</span>
      </h2>
      {aside && <div className="shrink-0 text-xs text-muted-foreground">{aside}</div>}
    </div>
  );
}

/* ---------------------------------- metric ---------------------------------- */

export function Metric({
  label,
  value,
  delta,
  hint,
  size = "md",
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel lift relative min-w-0 overflow-hidden p-3.5 sm:p-5",
        accent ? "gradient-primary sheen text-primary-foreground shadow-float" : "sheen",
        className,
      )}
    >
      {accent && (
        <span aria-hidden className="hairline-gold absolute inset-x-0 bottom-0 h-px opacity-80" />
      )}
      <p
        className={cn(
          "relative text-[10px] font-semibold tracking-[0.16em] uppercase",
          accent ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "numeric relative pt-2.5 font-semibold",
          size === "lg"
            ? "text-3xl sm:text-[40px] sm:leading-[1.05]"
            : size === "sm"
              ? "text-xl"
              : "text-2xl sm:text-[26px]",
        )}
      >
        {value}
      </p>
      {(delta || hint) && (
        <div className="relative flex items-center gap-2 pt-2">
          {delta && (
            <span
              className={cn(
                "numeric inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                accent
                  ? "bg-primary-foreground/12 text-primary-luminous"
                  : delta.startsWith("-")
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary",
              )}
            >
              {delta}
            </span>
          )}
          {hint && (
            <span
              className={cn(
                "truncate text-xs",
                accent ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- chips ---------------------------------- */

export type ChipTone = "neutral" | "positive" | "info" | "warning" | "danger";

const chipTones: Record<ChipTone, string> = {
  neutral: "bg-surface-c text-muted-foreground",
  positive: "bg-success/12 text-success",
  info: "bg-secondary/14 text-secondary",
  warning: "bg-warning/18 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
};

const chipDots: Record<ChipTone, string> = {
  neutral: "bg-muted-foreground/60",
  positive: "bg-success",
  info: "bg-secondary",
  warning: "bg-warning",
  danger: "bg-destructive",
};

const POSITIVE = new Set([
  "available",
  "succeeded",
  "success",
  "verified",
  "completed",
  "active",
  "approved",
  "paid",
  "converted",
  "sold out",
]);
const INFO = new Set([
  "booked",
  "confirmed",
  "scheduled",
  "ready",
  "agreement",
  "invited",
  "submitted",
  "in progress",
]);
const WARNING = new Set([
  "reserved",
  "pending",
  "expiring today",
  "documentation",
  "on hold",
  "pre-launch",
  "draft",
]);
const DANGER = new Set(["expired", "failed", "rejected", "cancelled", "suspended", "overdue"]);

export function toneFor(value: string): ChipTone {
  const v = value.trim().toLowerCase();
  if (POSITIVE.has(v)) return "positive";
  if (INFO.has(v)) return "info";
  if (WARNING.has(v)) return "warning";
  if (DANGER.has(v)) return "danger";
  return "neutral";
}

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-[11px] font-medium whitespace-nowrap";

/**
 * Status pill. Plot statuses (canonical or legacy spellings) render with the
 * domain plot colors unless an explicit `tone` is passed; everything else is
 * toned via `toneFor`.
 */
export function Chip({
  children,
  tone,
  className,
}: {
  children: string;
  tone?: ChipTone;
  className?: string;
}) {
  const plotStatus = tone ? null : plotStatusFromLabel(children);
  if (plotStatus) {
    const c = plotStatusColors(plotStatus);
    return (
      <span className={cn(chipBase, className)} style={{ background: c.fill, color: c.ink }}>
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.solid }} />
        {children}
      </span>
    );
  }

  const key = tone ?? toneFor(children);
  return (
    <span className={cn(chipBase, chipTones[key], className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", chipDots[key])} />
      {children}
    </span>
  );
}

/** Chip for a stored plot status value (e.g. `RESALE_AVAILABLE`), labelled from the domain. */
export function PlotStatusChip({
  status,
  label,
  className,
}: {
  status: unknown;
  label?: string;
  className?: string;
}) {
  const c = plotStatusColors(status);
  return (
    <span className={cn(chipBase, className)} style={{ background: c.fill, color: c.ink }}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.solid }} />
      {label ?? c.label}
    </span>
  );
}

/* -------------------------------- filter bar -------------------------------- */

const toolbarButton =
  "flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-low px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-c hover:text-foreground md:h-9";

export function FilterBar({
  views,
  active,
  onSelect,
  right,
  placeholder = "Search…",
  query,
  onQuery,
  onFilters,
  onExport,
}: {
  views?: string[];
  active?: string;
  onSelect?: (v: string) => void;
  right?: ReactNode;
  placeholder?: string;
  query?: string;
  onQuery?: (v: string) => void;
  /** Shows the Filters button when provided. */
  onFilters?: () => void;
  /** Shows the Export button when provided. */
  onExport?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 pb-4 md:flex-row md:flex-wrap md:items-center">
      {views && views.length > 0 && (
        <ScrollTabs
          activeKey={active}
          className="-mx-1 rounded-xl px-1 py-1 md:mx-0 md:flex-wrap md:overflow-x-visible md:bg-surface-low md:px-1"
        >
          {views.map((v) => (
            <button
              key={v}
              type="button"
              data-active={v === active ? "true" : undefined}
              aria-pressed={v === active}
              onClick={() => onSelect?.(v)}
              className={cn(
                "flex-none rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 md:py-1.5",
                v === active
                  ? "bg-surface-lowest text-foreground shadow-ambient"
                  : "text-muted-foreground hover:bg-surface-c hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </ScrollTabs>
      )}
      <div className="hidden flex-1 md:block" />
      <div className="flex items-center gap-2">
        {onQuery && (
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-low px-3 transition-shadow duration-200 focus-within:shadow-glow md:h-9 md:flex-none">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query ?? ""}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground focus-visible:outline-none md:w-48"
            />
          </label>
        )}
        {onFilters && (
          <button type="button" onClick={onFilters} className={toolbarButton}>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        )}
        {onExport && (
          <button type="button" onClick={onExport} className={toolbarButton}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}
        {right}
      </div>
    </div>
  );
}

/* -------------------------------- data table -------------------------------- */

/**
 * Fill `:param` / `$param` segments of a path template, e.g.
 * `resolvePathTemplate("/plots/:id", { id: "p1" })` → `/plots/p1`.
 */
export function resolvePathTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/[:$]([A-Za-z_][A-Za-z0-9_]*)/g, (match, name: string) => {
    const value = values[name];
    return value === undefined || value === null ? match : encodeURIComponent(String(value));
  });
}

export type RowLink<T> = string | ((row: T) => string | null | undefined);

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "right";
  width?: string;
  cell: (row: T) => ReactNode;
}

function resolveRowLink<T extends { id: string | number }>(
  linkTo: RowLink<T> | undefined,
  row: T,
  params?: (row: T) => Record<string, string>,
): string | null {
  if (!linkTo) return null;
  if (typeof linkTo === "function") return linkTo(row) || null;
  return resolvePathTemplate(linkTo, { ...(row as Record<string, unknown>), ...params?.(row) });
}

export function DataTable<T extends { id: string | number }>({
  rows,
  columns,
  linkTo,
  params,
  renderMobileCard,
  emptyMessage = "Nothing matches these filters.",
  className,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  /**
   * Row destination: `(row) => "/plots/" + row.id`, or a path template such as
   * `/plots/:id` filled from `params(row)` then the row's own fields.
   */
  linkTo?: RowLink<T>;
  params?: (row: T) => Record<string, string>;
  /** When provided, the mobile (< md) view renders this instead of the generic field grid. */
  renderMobileCard?: (row: T) => ReactNode;
  emptyMessage?: ReactNode;
  className?: string;
}) {
  const [first, ...rest] = columns;
  const hasLinks = Boolean(linkTo);

  return (
    <div className={className}>
      {/* Mobile: stacked record cards */}
      <div className="space-y-2 md:hidden">
        {renderMobileCard
          ? rows.map((row) => <Fragment key={row.id}>{renderMobileCard(row)}</Fragment>)
          : rows.map((row) => {
              const href = resolveRowLink(linkTo, row, params);
              return (
                <div
                  key={row.id}
                  className="panel p-3.5 transition-transform duration-200 active:scale-[0.995]"
                >
                  {first && (
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0 text-sm font-medium">{first.cell(row)}</div>
                      {href && (
                        <Link
                          to={href}
                          aria-label="Open record"
                          className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-surface-low"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  )}
                  {rest.length > 0 && (
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                      {rest.map((c) => (
                        <div key={c.key} className="min-w-0">
                          <dt className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                            {c.header}
                          </dt>
                          <dd className="min-w-0 pt-0.5 text-sm">{c.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}

        {rows.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </div>

      {/* Tablet and up: table */}
      <div className="panel hidden overflow-hidden p-0 md:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="glass">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase",
                      c.align === "right" && "text-right",
                    )}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.header}
                  </th>
                ))}
                {hasLinks && <th className="w-10" aria-hidden />}
              </tr>
              <tr aria-hidden>
                <th colSpan={columns.length + (hasLinks ? 1 : 0)} className="h-px p-0">
                  <span className="hairline-gold block h-px w-full opacity-60" />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = resolveRowLink(linkTo, row, params);
                return (
                  <tr
                    key={row.id}
                    className="group relative transition-colors duration-150 hover:bg-surface-low"
                  >
                    {columns.map((c, ci) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3.5 align-middle",
                          c.align === "right" && "text-right",
                          ci === 0 &&
                            "relative before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-transparent before:transition-colors group-hover:before:bg-primary",
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {hasLinks && (
                      <td className="px-3 text-right">
                        {href && (
                          <Link
                            to={href}
                            aria-label="Open record"
                            className="inline-flex text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + (hasLinks ? 1 : 0)}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- record header ------------------------------ */

export function RecordHeader({
  eyebrow,
  title,
  subtitle,
  facts,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  facts: { label: string; value: ReactNode }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel rise sheen relative mt-4 overflow-hidden p-5 sm:mt-6 sm:p-8", className)}>
      <span aria-hidden className="hairline-gold absolute inset-x-0 top-0 h-px opacity-70" />
      <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="flex items-center gap-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-[34px] sm:leading-[1.12]">
            {title}
          </h1>
          {subtitle && (
            <div className="pt-2 text-sm text-muted-foreground text-pretty">{subtitle}</div>
          )}
        </div>
        {actions && <div className="relative z-[1] flex flex-wrap gap-2">{actions}</div>}
      </div>
      {facts.length > 0 && (
        <>
          <span aria-hidden className="ghost-line mt-6 block h-px w-full sm:mt-8" />
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:mt-6 sm:gap-x-8 sm:gap-y-6 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {f.label}
                </p>
                <div className="numeric pt-1.5 text-base font-medium">{f.value}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------- buttons --------------------------------- */

export type BtnVariant = "primary" | "ghost" | "tonal" | "danger";

/** Class list for Btn-styled elements (use on anchors or custom triggers). */
export function btnClasses(variant: BtnVariant = "ghost", className?: string) {
  return cn(
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60",
    variant === "primary" && "gradient-primary text-primary-foreground shadow-ambient hover:shadow-glow",
    variant === "tonal" && "bg-surface-c text-foreground hover:bg-surface-high",
    variant === "ghost" && "text-muted-foreground hover:bg-surface-low hover:text-foreground",
    variant === "danger" && "bg-destructive/12 font-semibold text-destructive hover:bg-destructive/20",
    className,
  );
}

export function Btn({
  children,
  variant = "ghost",
  className,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} {...rest} className={btnClasses(variant, className)}>
      {children}
    </button>
  );
}

/** Btn styling on a react-router Link. */
export function LinkBtn({
  children,
  variant = "ghost",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  className?: string;
} & Omit<LinkProps, "className" | "children">) {
  return (
    <Link {...rest} className={btnClasses(variant, className)}>
      {children}
    </Link>
  );
}

export function NewRecordButton({
  to,
  search,
  children,
  className,
}: {
  to: string;
  search?: Record<string, string | undefined>;
  children: ReactNode;
  className?: string;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search ?? {})) {
    if (value !== undefined) query.set(key, value);
  }
  const qs = query.toString();
  return (
    <Link
      to={qs ? { pathname: to, search: `?${qs}` } : to}
      className={cn(
        "gradient-primary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-primary-foreground shadow-ambient transition-all duration-200 hover:shadow-glow active:scale-[0.97]",
        className,
      )}
    >
      <Plus className="h-4 w-4" />
      {children}
    </Link>
  );
}

/* --------------------------------- timeline --------------------------------- */

export function Timeline({
  items,
  className,
}: {
  items: { time: string; title: ReactNode; detail?: ReactNode }[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-6", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex flex-col items-center pt-1">
            <span className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-primary" : "bg-outline-variant")} />
            {i < items.length - 1 && <span className="ghost-line mt-1 w-px flex-1" />}
          </div>
          <div className="pb-1">
            <p className="text-sm font-medium">{it.title}</p>
            {it.detail && <p className="pt-0.5 text-xs text-muted-foreground">{it.detail}</p>}
            <p className="numeric pt-1 text-[11px] text-muted-foreground">{it.time}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------- switch ---------------------------------- */

/** Off = grey, knob left. On = primary track, white knob right. */
export function SwitchControl({
  checked,
  onCheckedChange,
  disabled,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-on={checked ? "true" : "false"}
      dir="ltr"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn("bhairava-switch", className)}
    >
      <span className="bhairava-switch-thumb" />
    </button>
  );
}
