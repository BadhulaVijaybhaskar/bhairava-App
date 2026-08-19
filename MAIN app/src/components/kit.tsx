import { Link } from "@tanstack/react-router";
import { ChevronRight, SlidersHorizontal, Search, Download, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rise py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="flex items-center gap-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-[32px] sm:leading-[1.15]">
            {title}
          </h1>
          {description && (
            <p className="max-w-prose pt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <span aria-hidden className="hairline-gold mt-5 block h-px w-full opacity-70 sm:mt-6" />
    </div>
  );
}


export function Panel({
  children,
  className,
  tonal,
}: {
  children: ReactNode;
  className?: string;
  tonal?: boolean;
}) {
  return (
    <section className={cn(tonal ? "panel-tonal" : "panel", "p-4 sm:p-6", className)}>
      {children}
    </section>
  );
}


export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      <h2 className="flex min-w-0 items-center gap-2.5 font-display text-sm font-semibold tracking-tight">
        <span aria-hidden className="gradient-gold h-3.5 w-[3px] shrink-0 rounded-full" />
        <span className="truncate">{children}</span>
      </h2>
      {aside && <div className="shrink-0 text-xs text-muted-foreground">{aside}</div>}
    </div>
  );
}


export function Metric({
  label,
  value,
  delta,
  hint,
  size = "md",
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  size?: "sm" | "md" | "lg";
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "panel lift relative overflow-hidden p-4 sm:p-5",
        accent ? "gradient-primary sheen text-primary-foreground shadow-float" : "sheen",
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
      <div className="relative flex items-center gap-2 pt-2">
        {delta && (
          <span
            className={cn(
              "numeric inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              accent
                ? "bg-primary-foreground/12 text-gold"
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
    </div>
  );
}


const chipTones: Record<string, string> = {
  neutral: "bg-surface-c text-muted-foreground",
  positive: "bg-primary/12 text-primary",
  info: "bg-secondary/14 text-secondary",
  warning: "bg-warning/18 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
};

const chipDots: Record<string, string> = {
  neutral: "bg-muted-foreground/60",
  positive: "bg-primary",
  info: "bg-secondary",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function toneFor(value: string): keyof typeof chipTones {
  const v = value.toLowerCase();
  if (["available", "succeeded", "verified", "registered", "completed", "active", "converted", "sold out"].includes(v))
    return "positive";
  if (["booked", "confirmed", "scheduled", "ready", "agreement", "invited"].includes(v)) return "info";
  if (["reserved", "pending", "expiring today", "documentation", "on hold", "pre-launch", "draft"].includes(v))
    return "warning";
  if (["expired", "failed", "rejected", "cancelled", "suspended", "overdue"].includes(v)) return "danger";
  return "neutral";
}

export function Chip({ children, tone }: { children: string; tone?: keyof typeof chipTones }) {
  const key = tone ?? toneFor(children);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-2 text-[11px] font-medium whitespace-nowrap",
        chipTones[key],
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", chipDots[key])} />
      {children}
    </span>
  );
}


export function FilterBar({
  views,
  active,
  onSelect,
  right,
  placeholder = "Search…",
  query,
  onQuery,
}: {
  views?: string[];
  active?: string;
  onSelect?: (v: string) => void;
  right?: ReactNode;
  placeholder?: string;
  query?: string;
  onQuery?: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 pb-4 md:flex-row md:flex-wrap md:items-center">
      {views && views.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-xl px-1 py-1 md:mx-0 md:flex-wrap md:overflow-visible md:bg-surface-low md:px-1">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={v === active}
              onClick={() => onSelect?.(v)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200 md:py-1.5",
                v === active
                  ? "bg-surface-lowest text-foreground shadow-ambient"
                  : "text-muted-foreground hover:bg-surface-c hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}
      <div className="hidden flex-1 md:block" />
      <div className="flex items-center gap-2">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-low px-3 transition-shadow duration-200 focus-within:shadow-glow md:h-9 md:flex-none">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query ?? ""}
            onChange={(e) => onQuery?.(e.target.value)}
            placeholder={placeholder}
            className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground focus-visible:outline-none md:w-48"
          />
        </label>
        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-low px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-c hover:text-foreground md:h-9"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-low px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-c hover:text-foreground md:h-9"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
        {right}
      </div>
    </div>
  );
}



export function DataTable<T extends { id: string }>({
  rows,
  columns,
  linkTo,
  params,
}: {
  rows: T[];
  columns: { key: string; header: string; align?: "right"; width?: string; cell: (row: T) => ReactNode }[];
  linkTo?: string;
  params?: (row: T) => Record<string, string>;
}) {
  const [first, ...rest] = columns;

  return (
    <>
      {/* Mobile: stacked record cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="panel p-4 transition-transform duration-200 active:scale-[0.995]">
            {first && (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 text-sm font-medium">{first.cell(row)}</div>
                {linkTo && (
                  <Link
                    to={linkTo}
                    params={params?.(row) as never}
                    aria-label="Open record"
                    className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:bg-surface-low"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
            {rest.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
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
        ))}

        {rows.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            Nothing matches these filters.
          </div>
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
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase whitespace-nowrap",
                      c.align === "right" && "text-right",
                    )}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.header}
                  </th>
                ))}
                {linkTo && <th className="w-10" />}
              </tr>
              <tr aria-hidden>
                <th colSpan={columns.length + (linkTo ? 1 : 0)} className="h-px p-0">
                  <span className="hairline-gold block h-px w-full opacity-60" />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                  {linkTo && (
                    <td className="px-3 text-right">
                      <Link
                        to={linkTo}
                        params={params?.(row) as never}
                        aria-label="Open record"
                        className="inline-flex text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-14 text-center text-sm text-muted-foreground"
                  >
                    Nothing matches these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


export function RecordHeader({
  eyebrow,
  title,
  subtitle,
  facts,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  facts: { label: string; value: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <div className="panel rise sheen relative mt-4 overflow-hidden p-5 sm:mt-6 sm:p-8">
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
          {subtitle && <div className="pt-2 text-sm text-muted-foreground text-pretty">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
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
    </div>
  );
}

export function Btn({
  children,
  variant = "ghost",
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "tonal";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
        variant === "primary" &&
          "gradient-primary text-primary-foreground shadow-ambient hover:shadow-glow",
        variant === "tonal" && "bg-surface-c text-foreground hover:bg-surface-high",
        variant === "ghost" && "text-muted-foreground hover:bg-surface-low hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}


export function Timeline({ items }: { items: { time: string; title: string; detail?: string | undefined }[] }) {
  return (
    <ol className="space-y-6">
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


export function NewRecordButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="gradient-primary inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-primary-foreground shadow-ambient transition-all duration-200 hover:shadow-glow active:scale-[0.97]"
    >
      <Plus className="h-4 w-4" />
      {children}
    </Link>
  );
}
