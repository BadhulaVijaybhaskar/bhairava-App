import { Check, ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog, useUnsavedGuard } from "@/components/form-kit";
import { cn } from "@/lib/utils";

export type FieldErrors<T extends object> = { [K in keyof T]?: string | undefined };

export interface WizardStep {
  title: string;
  summary: string;
  /** return an error message to block advancing */
  validate?: () => string | undefined;
  content: ReactNode;
}

interface WizardApi {
  currentStep: number;
  totalSteps: number;
  percent: number;
  goTo: (index: number) => void;
  back: () => void;
  last: boolean;
}

const WizardContext = createContext<WizardApi | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside <Wizard>");
  return ctx;
}

/* ------------------------------ draft persist ----------------------------- */

export function useOnboardingDraft<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storageKey = `bhairava.onboarding.${key}`;
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return initial;
      return { ...initial, ...(JSON.parse(raw) as Partial<T>) };
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [storageKey, state]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return [state, setState, clear];
}

export function focusFirstInvalid() {
  const el = document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  el?.focus();
}

/* ----------------------------- progress / nav ----------------------------- */

export function WizardProgress({
  currentStep,
  totalSteps,
  titles,
}: {
  currentStep: number;
  totalSteps: number;
  titles: string[];
}) {
  const percent = Math.round((currentStep / totalSteps) * 100);
  const title = titles[currentStep - 1] ?? "";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Step {currentStep} of {totalSteps}
        </p>
        <p className="numeric text-[11px] font-semibold text-primary">{percent}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={currentStep}
        aria-label={`Step ${currentStep} of ${totalSteps}: ${title}`}
        className="mt-2 flex gap-1.5"
      >
        {Array.from({ length: totalSteps }, (_, idx) => (
          <span
            key={titles[idx] ?? idx}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              idx < currentStep ? "gradient-primary" : "bg-surface-c",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function WizardNavigation({
  onBack,
  onNext,
  backDisabled,
  busy,
  last,
  submitLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  backDisabled: boolean;
  busy: boolean;
  last: boolean;
  submitLabel: string;
}) {
  return (
    <>
      <div className="mt-5 hidden items-center justify-between gap-3 lg:flex">
        <button
          type="button"
          disabled={backDisabled}
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-low hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="gradient-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-ambient transition-all duration-200 hover:shadow-glow active:scale-[0.98] disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {last ? submitLabel : "Continue"}
          {!last && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <div className="glass fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 px-4 py-2.5 lg:hidden">
        <button
          type="button"
          disabled={backDisabled}
          onClick={onBack}
          aria-label="Back to previous step"
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-low text-muted-foreground transition-colors active:bg-surface-c disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="gradient-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-ambient transition-transform duration-200 active:scale-[0.98] disabled:opacity-70"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {last ? submitLabel : "Continue"}
          {!last && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}

export function ReviewList({ rows }: { rows: { label: string; value: string; step?: number }[] }) {
  const wizard = useWizard();
  return (
    <dl className="divide-outline-variant/40 divide-y overflow-hidden rounded-xl bg-surface-low">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="pt-0.5 text-sm font-medium break-words">{row.value || "—"}</dd>
          </div>
          {row.step != null && (
            <button
              type="button"
              onClick={() => wizard.goTo(row.step!)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-primary"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
      ))}
    </dl>
  );
}

/* --------------------------------- wizard --------------------------------- */

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
  aside?: ReactNode | undefined;
  dirty?: boolean | undefined;
  onDiscard?: (() => void) | undefined;
}) {
  const [i, setI] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const totalSteps = steps.length;
  useUnsavedGuard(dirty && !busy);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return;
      setError(undefined);
      setI(index);
    },
    [steps.length],
  );

  const back = useCallback(() => goTo(Math.max(0, i - 1)), [goTo, i]);

  const api = useMemo<WizardApi>(
    () => ({
      currentStep: i + 1,
      totalSteps,
      percent: Math.round(((i + 1) / totalSteps) * 100),
      goTo,
      back,
      last,
    }),
    [i, totalSteps, goTo, back, last],
  );

  const next = () => {
    const err = step.validate?.();
    if (err) {
      setError(err);
      requestAnimationFrame(focusFirstInvalid);
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
    <WizardContext.Provider value={api}>
      <div className="grid gap-3 pb-28 sm:gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:pb-0">
        <div className="lg:hidden">
          {dirty && onDiscard && (
            <div className="mb-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
              >
                Discard
              </button>
            </div>
          )}
          <WizardProgress
            currentStep={i + 1}
            totalSteps={steps.length}
            titles={steps.map((s) => s.title)}
          />
        </div>

        <ol className="hidden lg:block lg:space-y-1">
          {steps.map((s, idx) => {
            const done = idx < i;
            const on = idx === i;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => idx <= i && setI(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200",
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
                    <span
                      className={cn(
                        "block truncate text-sm font-medium",
                        !on && !done && "text-muted-foreground",
                      )}
                    >
                      {s.title}
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground lg:block">
                      {s.summary}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {aside && <li className="hidden pt-3 lg:block">{aside}</li>}
        </ol>

        <div className="panel sheen rise p-3.5 sm:p-5">
          <p className="hidden items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:flex">
            <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
            Step {i + 1} of {steps.length}
            <span className="numeric ml-auto font-semibold text-primary">{api.percent}%</span>
          </p>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em] lg:pt-1.5">
            {step.title}
          </h2>
          <p className="pt-0.5 text-sm text-muted-foreground">{step.summary}</p>
          <span aria-hidden className="hairline-gold mt-3 mb-3.5 block h-px w-full opacity-70" />

          <div key={i} className="rise space-y-3">
            {step.content}
          </div>

          {error && (
            <p role="alert" className="pt-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <WizardNavigation
            onBack={back}
            onNext={next}
            backDisabled={i === 0}
            busy={busy}
            last={last}
            submitLabel={submitLabel}
          />
        </div>
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
    </WizardContext.Provider>
  );
}

/* --------------------------------- shell ---------------------------------- */

export function OnboardingShell({
  eyebrow = "Onboarding",
  title,
  description,
  steps,
  onComplete,
  submitLabel,
  dirty,
  onDiscard,
  aside,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  steps: WizardStep[];
  onComplete: () => void;
  submitLabel: string;
  dirty?: boolean | undefined;
  onDiscard?: (() => void) | undefined;
  aside?: ReactNode | undefined;
}) {
  return (
    <AppShell>
      <header className="rise pb-3 pt-2 sm:pb-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
          {eyebrow}
        </p>
        <h1 className="pt-1 font-display text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose pt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <Wizard
        steps={steps}
        onComplete={onComplete}
        submitLabel={submitLabel}
        dirty={dirty}
        onDiscard={onDiscard}
        aside={aside}
      />
    </AppShell>
  );
}
