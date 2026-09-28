import { Check, ChevronRight, X } from "lucide-react";
import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../lib/utils";
import { btnClasses } from "./kit";
import { Drawer } from "./drawer";
import { Modal } from "./modal";

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
        {required && (
          <span aria-hidden className="text-primary">
            *
          </span>
        )}
      </span>
      {children}
      {(error ?? hint) && (
        <span
          role={error ? "alert" : undefined}
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

export const fieldBase =
  "h-11 w-full rounded-xl bg-surface-low px-3.5 text-sm text-foreground outline-none transition-shadow duration-200 placeholder:text-muted-foreground/70 focus:shadow-glow disabled:cursor-not-allowed disabled:opacity-70";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "className" | "placeholder" | "readOnly"
>;

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
  readOnly,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  type?: string | undefined;
  invalid?: boolean | undefined;
  readOnly?: boolean | undefined;
  className?: string | undefined;
} & NativeInputProps) {
  return (
    <input
      {...rest}
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
        className,
      )}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  step,
  min,
  max,
  readOnly,
  invalid,
  className,
  ...rest
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string | undefined;
  step?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  readOnly?: boolean | undefined;
  invalid?: boolean | undefined;
  className?: string | undefined;
} & Omit<NativeInputProps, "step" | "min" | "max">) {
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ""}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={cn(
        fieldBase,
        "numeric",
        invalid && "ring-1 ring-destructive",
        readOnly && "text-muted-foreground",
        className,
      )}
    />
  );
}

export type SelectOption<T extends string> = { value: T; label: string };

export function SelectInput<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  invalid,
  size = "md",
  disabled,
  className,
  id,
  name,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: readonly T[] | readonly SelectOption<T>[];
  placeholder?: string | undefined;
  invalid?: boolean | undefined;
  size?: "md" | "lg";
  disabled?: boolean | undefined;
  className?: string | undefined;
  id?: string | undefined;
  name?: string | undefined;
}) {
  const opts = (options as readonly (T | SelectOption<T>)[]).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        data-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          fieldBase,
          "appearance-none pr-9",
          size === "lg" && "h-12",
          invalid && "ring-1 ring-destructive",
          !value && "text-muted-foreground",
          disabled && "text-muted-foreground",
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
  readOnly,
  invalid,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  rows?: number;
  readOnly?: boolean | undefined;
  invalid?: boolean | undefined;
  className?: string | undefined;
} & Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "className" | "placeholder" | "readOnly" | "rows"
>) {
  return (
    <textarea
      {...rest}
      rows={rows}
      value={value}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        fieldBase,
        "h-auto resize-none py-3 leading-relaxed",
        invalid && "ring-1 ring-destructive",
        readOnly && "text-muted-foreground",
        className,
      )}
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
  eyebrow = "Edit record",
  onSave,
  onDelete,
  saveLabel = "Save changes",
  saving,
  saveDisabled,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string;
  onSave: () => void;
  onDelete?: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={eyebrow}
      title={title}
      description={description}
      closeLabel="Close editor"
      hideClose
      footer={
        <>
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
            <button type="button" onClick={onClose} className={btnClasses("ghost", "px-3.5")}>
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saveDisabled}
              aria-busy={saving || undefined}
              className="gradient-primary min-h-10 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-ambient transition-all hover:shadow-glow active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {saving ? "Saving…" : saveLabel}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">{children}</div>
    </Drawer>
  );
}

/* ------------------------------ extra controls ----------------------------- */

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-low px-3.5 py-2.5 text-left transition-colors hover:bg-surface-c disabled:opacity-60"
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
    return <div className="rounded-xl bg-surface-low p-4 text-sm text-muted-foreground">{empty}</div>;
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
                aria-label={`Remove ${v}`}
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
  cancelLabel = "Keep editing",
  tone = "danger",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      hideClose
      dismissible={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={btnClasses("ghost", "min-h-11 px-4")}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
            className={btnClasses(tone === "danger" ? "danger" : "primary", "min-h-11 px-4 font-semibold")}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
