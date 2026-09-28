import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Loader2, Pencil, X } from 'lucide-react';
import { Btn, ConfirmDialog, PageHeader, cn, useOccupyCreateFab, useUnsavedGuard } from '@bhairava/ui-web';
import { errMsg } from '../lib/data';

export type FieldErrors<T extends object> = { [K in keyof T]?: string | undefined };

export interface WizardStep {
  title: string;
  summary: string;
  /** Return an error message to block advancing. */
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
  if (!ctx) throw new Error('useWizard must be used inside <Wizard>');
  return ctx;
}

/** In-memory form state + per-field errors for a wizard. Nothing is persisted. */
export function useWizardForm<T extends object>(initial: T) {
  const initialRef = useRef(initial);
  const [form, setForm] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);
  const check = useCallback((map: FieldErrors<T>) => {
    setErrors((prev) => ({ ...prev, ...map }));
    return Object.values(map).some(Boolean) ? 'Fix the highlighted fields to continue.' : undefined;
  }, []);
  const dirty = JSON.stringify(form) !== JSON.stringify(initialRef.current);
  return { form, set, errors, check, dirty };
}

export function focusFirstInvalid() {
  const el = document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']");
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.focus();
}

export function WizardProgress({ currentStep, totalSteps, titles }: { currentStep: number; totalSteps: number; titles: string[] }) {
  const percent = Math.round((currentStep / totalSteps) * 100);
  const title = titles[currentStep - 1] ?? '';
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
            className={cn('h-1 flex-1 rounded-full transition-colors duration-300', idx < currentStep ? 'gradient-primary' : 'bg-surface-c')}
          />
        ))}
      </div>
    </div>
  );
}

function WizardNavigation({
  onBack,
  onNext,
  showBack,
  busy,
  last,
  submitLabel,
  submitTestId,
}: {
  onBack: () => void;
  onNext: () => void;
  showBack: boolean;
  busy: boolean;
  last: boolean;
  submitLabel: string;
  submitTestId?: string | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const actionLabel = last ? (busy ? 'Saving…' : submitLabel) : 'Continue';

  return (
    <>
      <div className="mt-5 hidden items-center justify-between gap-3 lg:flex">
        {showBack ? (
          <Btn onClick={onBack} className="min-h-11">
            <ChevronLeft className="h-4 w-4" /> Back
          </Btn>
        ) : (
          <span />
        )}
        <Btn type="submit" variant="primary" disabled={busy} className="min-h-11 px-5 font-semibold" data-testid={last ? submitTestId : undefined}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {actionLabel}
          {!last && <ChevronRight className="h-4 w-4" />}
        </Btn>
      </div>

      {mounted
        ? createPortal(
            <div className="wizard-action-bar">
              {showBack && (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label="Back to previous step"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-low text-muted-foreground transition-colors active:bg-surface-c"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onNext}
                disabled={busy}
                className="gradient-primary inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-primary-foreground shadow-ambient transition-transform duration-200 active:scale-[0.98] disabled:opacity-70"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionLabel}
                {!last && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ReviewList({ rows }: { rows: { label: string; value: ReactNode; step?: number }[] }) {
  const wizard = useWizard();
  return (
    <dl className="divide-y divide-outline-variant/40 overflow-hidden rounded-xl bg-surface-low">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{row.label}</dt>
            <dd className="pt-0.5 text-sm font-medium break-words">{row.value || '—'}</dd>
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

export function Wizard({
  steps,
  onComplete,
  submitLabel = 'Create record',
  submitTestId,
  aside,
  dirty = false,
}: {
  steps: WizardStep[];
  /** Runs on the last step. Throw to surface an error and stay on the step. */
  onComplete: () => Promise<void> | void;
  submitLabel?: string;
  submitTestId?: string;
  aside?: ReactNode;
  dirty?: boolean;
}) {
  useOccupyCreateFab();
  const [i, setI] = useState(0);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const step = steps[Math.min(i, steps.length - 1)]!;
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
    () => ({ currentStep: i + 1, totalSteps, percent: Math.round(((i + 1) / totalSteps) * 100), goTo, back, last }),
    [i, totalSteps, goTo, back, last],
  );

  const next = async () => {
    if (busy) return;
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
    try {
      await onComplete();
    } catch (ex) {
      setError(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void next();
  };

  return (
    <WizardContext.Provider value={api}>
      <div className="grid gap-3 pb-[calc(var(--wizard-action-height)+1.25rem)] sm:gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:pb-0">
        <div className="lg:hidden">
          <WizardProgress currentStep={i + 1} totalSteps={totalSteps} titles={steps.map((s) => s.title)} />
        </div>

        <ol className="hidden lg:block lg:space-y-1">
          {steps.map((s, idx) => {
            const done = idx < i;
            const on = idx === i;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => idx <= i && goTo(idx)}
                  aria-current={on ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200',
                    on ? 'bg-surface-low' : 'hover:bg-surface-low/60',
                  )}
                >
                  <span
                    className={cn(
                      'numeric flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                      done ? 'bg-primary/15 text-primary' : on ? 'gradient-primary text-primary-foreground' : 'bg-surface-c text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-sm font-medium', !on && !done && 'text-muted-foreground')}>{s.title}</span>
                    <span className="hidden truncate text-xs text-muted-foreground lg:block">{s.summary}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {aside && <li className="hidden pt-3 lg:block">{aside}</li>}
        </ol>

        <form onSubmit={onSubmit} noValidate className="panel sheen rise min-w-0 p-3.5 sm:p-5">
          <p className="hidden items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase lg:flex">
            <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
            Step {i + 1} of {totalSteps}
            <span className="numeric ml-auto font-semibold text-primary">{api.percent}%</span>
          </p>
          <h2 className="font-display text-lg font-semibold tracking-[-0.02em] lg:pt-1.5">{step.title}</h2>
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
            onNext={() => void next()}
            showBack={i > 0}
            busy={busy}
            last={last}
            submitLabel={submitLabel}
            submitTestId={submitTestId}
          />
        </form>
      </div>
    </WizardContext.Provider>
  );
}

/** Page chrome for a wizard: header with Cancel (confirming discard when dirty) + `Wizard`. */
export function OnboardingShell({
  eyebrow = 'Onboarding',
  title,
  description,
  cancelTo,
  dirty = false,
  ...wizard
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  cancelTo: string;
  steps: WizardStep[];
  onComplete: () => Promise<void> | void;
  submitLabel: string;
  submitTestId?: string;
  dirty?: boolean;
  aside?: ReactNode;
}) {
  const nav = useNavigate();
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <Btn onClick={() => (dirty ? setConfirming(true) : nav(cancelTo))}>
            <X className="h-4 w-4" /> Cancel
          </Btn>
        }
      />
      <Wizard {...wizard} dirty={dirty} />
      <ConfirmDialog
        open={confirming}
        title="Discard this form?"
        description="Everything you have entered on this record will be lost."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          nav(cancelTo);
        }}
      />
    </>
  );
}
