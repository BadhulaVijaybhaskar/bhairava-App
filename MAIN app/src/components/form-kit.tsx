import { Check, ChevronRight, Upload, X } from "lucide-react";
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
      <span className="flex items-baseline gap-1.5 pb-1 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
        {required && <span className="text-gold">*</span>}
      </span>
      {children}
      {(error ?? hint) && (
        <span
          className={cn(
            "mt-1 block min-h-[1rem] text-xs leading-4",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
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
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  type?: string | undefined;
  invalid?: boolean | undefined;
  readOnly?: boolean | undefined;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        fieldBase,
        invalid && "ring-1 ring-destructive",
        readOnly && "text-muted-foreground",
      )}
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
  placeholder,
  invalid,
  size = "md",
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: readonly T[] | { value: T; label: string }[];
  placeholder?: string;
  invalid?: boolean;
  size?: "md" | "lg";
}) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="relative">
      <select
        value={value}
        aria-invalid={invalid || undefined}
        data-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          fieldBase,
          "appearance-none pr-9",
          size === "lg" && "h-12",
          invalid && "ring-1 ring-destructive",
          !value && "text-muted-foreground",
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
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
              on
                ? "gradient-primary text-primary-foreground shadow-ambient"
                : "bg-surface-low hover:bg-surface-c",
            )}
          >
            <span className="block text-sm font-medium">{o.label}</span>
            {o.hint && (
              <span
                className={cn(
                  "block pt-0.5 text-xs",
                  on ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex justify-end"
    >
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
  if (options.length === 0)
    return (
      <div className="rounded-xl bg-surface-low p-4 text-sm text-muted-foreground">{empty}</div>
    );
  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
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
              "lift flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-200",
              on
                ? "gradient-primary text-primary-foreground shadow-ambient"
                : "bg-surface-low hover:bg-surface-c",
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
                <span
                  className={cn(
                    "block truncate text-xs",
                    on ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
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
        <span className="text-sm font-medium">
          {value ? "Replace image" : "Upload master layout"}
        </span>
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
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
