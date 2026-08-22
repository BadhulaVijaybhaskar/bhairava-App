import { Check, ChevronLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/* ---------------------------------- fields --------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="flex items-baseline gap-1.5 pb-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
        {required && <span className="text-gold">*</span>}
      </span>
      {children}
      {(error ?? hint) && (
        <span className={cn("block pt-1.5 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

const fieldBase =
  "h-11 w-full rounded-xl bg-surface-low px-3.5 text-sm text-foreground outline-none transition-shadow duration-200 placeholder:text-muted-foreground/70 focus:shadow-glow";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  type?: string | undefined;
  invalid?: boolean | undefined;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldBase, invalid && "ring-1 ring-destructive")}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      step={step}
      value={Number.isFinite(value) ? value : ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={cn(fieldBase, "numeric")}
    />
  );
}

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[] | { value: T; label: string }[];
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(fieldBase, "appearance-none pr-9")}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-foreground"
      />
    </div>
  );
}

export function TextareaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(fieldBase, "h-auto resize-none py-3 leading-relaxed")}
    />
  );
}

export function ChoiceGrid<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "lift rounded-xl px-3.5 py-3 text-left transition-all duration-200",
              on ? "gradient-primary text-primary-foreground shadow-ambient" : "bg-surface-low hover:bg-surface-c",
            )}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && (
              <span className={cn("block pt-0.5 text-xs", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------- wizard --------------------------------- */

export interface WizardStep {
  title: string;
  summary: string;
  /** return an error message to block advancing */
  validate?: () => string | undefined;
  content: ReactNode;
}

export function Wizard({
  steps,
  onComplete,
  submitLabel = "Create record",
  aside,
  dirty = false,
  onDiscard,
}: {
  steps: WizardStep[];
  onComplete: () => void;
  submitLabel?: string;
  aside?: ReactNode;
  dirty?: boolean;
  onDiscard?: () => void;
}) {
  const [i, setI] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const pct = Math.round(((i + 1) / steps.length) * 100);
  useUnsavedGuard(dirty && !busy);

  const next = () => {
    const err = step.validate?.();
    if (err) {
      setError(err);
      return;
    }
    setError(undefined);
    if (!last) {
      setI(i + 1);
      return;
    }
    setBusy(true);
    onComplete();
  };

  return (
    <div className="grid gap-4 pb-28 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 lg:pb-0">
      {/* mobile progress — native task-flow header */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Step {i + 1} of {steps.length}
          </p>
          <div className="flex items-baseline gap-3">
            {dirty && onDiscard && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
              >
                Discard
              </button>
            )}
            <p className="numeric text-[11px] font-semibold text-primary">{pct}%</p>
          </div>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={i + 1}
          aria-label={`Step ${i + 1} of ${steps.length}: ${step.title}`}
          className="mt-2 flex gap-1.5"
        >
          {steps.map((s, idx) => (
            <span
              key={s.title}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                idx <= i ? "gradient-primary" : "bg-surface-c",
              )}
            />
          ))}
        </div>
      </div>

      {/* step rail */}
      <ol className="hidden lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
        {steps.map((s, idx) => {
          const done = idx < i;
          const on = idx === i;
          return (
            <li key={s.title} className="shrink-0 lg:shrink">
              <button
                type="button"
                onClick={() => idx <= i && setI(idx)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200",
                  on ? "bg-surface-low" : "hover:bg-surface-low/60",
                )}
              >
                <span
                  className={cn(
                    "numeric flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    done
                      ? "bg-primary/15 text-primary"
                      : on
                        ? "gradient-primary text-primary-foreground"
                        : "bg-surface-c text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", !on && !done && "text-muted-foreground")}>
                    {s.title}
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground lg:block">{s.summary}</span>
                </span>
              </button>
            </li>
          );
        })}
        {aside && <li className="hidden pt-4 lg:block">{aside}</li>}
      </ol>

      {/* step body */}
      <div className="panel sheen rise p-4 sm:p-6">
        <p className="hidden items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:flex">
          <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
          Step {i + 1} of {steps.length}
        </p>
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] lg:pt-2">{step.title}</h2>
        <p className="pt-1 text-sm text-muted-foreground">{step.summary}</p>
        <span aria-hidden className="hairline-gold mt-4 mb-5 block h-px w-full opacity-70 sm:mb-6" />

        <div key={i} className="rise space-y-4">{step.content}</div>

        {error && (
          <p role="alert" className="pt-4 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* desktop actions */}
        <div className="mt-8 hidden items-center justify-between gap-3 lg:flex">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => setI(Math.max(0, i - 1))}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {dirty && onDiscard && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="min-h-10 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
              >
                Discard
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className="gradient-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-ambient transition-all duration-200 hover:shadow-glow active:scale-[0.98] disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {last ? submitLabel : "Continue"}
            {!last && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* mobile action bar — docked above the tab bar */}
      <div className="glass fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 px-4 py-3 lg:hidden">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI(Math.max(0, i - 1))}
          aria-label="Back to previous step"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-low text-muted-foreground transition-colors active:bg-surface-c disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={busy}
          className="gradient-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-ambient transition-transform duration-200 active:scale-[0.98] disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {last ? submitLabel : "Continue"}
          {!last && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Discard this form?"
        description="Everything you have entered on this record will be lost."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          onDiscard?.();
        }}
      />
    </div>
  );
}

/* ----------------------------- edit side sheet ----------------------------- */

export function EditSheet({
  open,
  onClose,
  title,
  description,
  onSave,
  onDelete,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSave: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="glass relative flex h-full w-full max-w-lg flex-col overflow-y-auto p-5 shadow-float sm:p-7">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
          Edit record
        </p>
        <h2 className="pt-2 font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
        {description && <p className="pt-1 text-sm text-muted-foreground">{description}</p>}
        <span aria-hidden className="hairline-gold mt-4 mb-6 block h-px w-full opacity-70" />

        <div className="flex-1 space-y-4">{children}</div>

        <div className="glass sticky bottom-0 -mx-5 mt-8 flex rounded-t-2xl px-5 pb-2 sm:-mx-7 sm:px-7 items-center justify-between gap-3 pt-4">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="min-h-10 rounded-xl px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-xl px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="gradient-primary min-h-10 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-ambient transition-all hover:shadow-glow active:scale-[0.98]"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------ extra controls ----------------------------- */

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-low px-3.5 py-2.5 text-left transition-colors hover:bg-surface-c"
    >
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-200",
          checked ? "gradient-primary text-primary-foreground shadow-ambient" : "bg-surface-c",
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </button>
  );
}

export function MultiSelect({
  values,
  onChange,
  options,
  empty,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string; hint?: string }[];
  empty?: ReactNode;
}) {
  if (options.length === 0) return <div className="rounded-xl bg-surface-low p-4 text-sm text-muted-foreground">{empty}</div>;
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(o.value)}
            className={cn(
              "lift flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-200",
              on ? "gradient-primary text-primary-foreground shadow-ambient" : "bg-surface-low hover:bg-surface-c",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                on ? "bg-primary-foreground/20" : "bg-surface-c",
              )}
            >
              {on && <Check className="h-3 w-3" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{o.label}</span>
              {o.hint && (
                <span className={cn("block truncate text-xs", on ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {o.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  hint,
}: {
  value?: string | undefined;
  onChange: (dataUrl: string | undefined) => void;
  hint?: string | undefined;
}) {
  const [name, setName] = useState<string>();
  return (
    <div className="space-y-3">
      <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-surface-low px-4 py-5 text-center transition-colors hover:bg-surface-c">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">{value ? "Replace image" : "Upload master layout"}</span>
        <span className="text-xs text-muted-foreground">{name ?? hint ?? "JPG, PNG or WebP"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setName(file.name);
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {value && (
        <div className="relative overflow-hidden rounded-xl bg-surface-low">
          <img src={value} alt="Master layout preview" className="max-h-48 w-full object-contain" />
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setName(undefined);
            }}
            className="absolute top-2 right-2 rounded-lg bg-background/80 px-2.5 py-1 text-xs font-medium text-destructive backdrop-blur"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

export function TagListInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={cn(fieldBase, "flex-1")}
        />
        <button
          type="button"
          onClick={add}
          className="h-11 shrink-0 rounded-xl bg-surface-low px-4 text-sm font-medium transition-colors hover:bg-surface-c"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {values.map((v, idx) => (
            <li key={`${v}-${idx}`}>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== idx))}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low py-1 pr-2 pl-3 text-xs font-medium transition-colors hover:bg-surface-c"
              >
                {v}
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --------------------------- unsaved-changes guard -------------------------- */

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Discard changes",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="glass rise relative w-full max-w-sm rounded-2xl p-5 shadow-float">
        <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        {description && <p className="pt-1.5 text-sm text-muted-foreground">{description}</p>}
        <div className="flex items-center justify-end gap-2 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-destructive/12 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
