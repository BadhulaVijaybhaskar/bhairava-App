"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const ERRORS: Record<string, string> = {
  required: "Name and mobile are required.",
  mobile: "Enter a valid 10-digit mobile number.",
  duplicate: "An agent with this mobile already exists.",
  projects: "One or more selected projects are invalid.",
};

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {required ? (
          <span className="ml-0.5 text-[11px] font-bold text-red-500" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-border/90 bg-white px-3 py-2 text-sm font-medium text-foreground outline-none transition placeholder:font-normal placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-brand/15";

function snapshotForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const entries: string[] = [];
  data.forEach((value, key) => {
    if (key === "id") return;
    entries.push(`${key}=${String(value)}`);
  });
  return entries.sort().join("&");
}

export function AgentForm({
  action,
  projects,
  error,
  saved,
  defaults,
  submitLabel,
  backHref,
}: {
  action: (formData: FormData) => Promise<void>;
  projects: { id: string; name: string; code: string; city: string | null }[];
  error?: string;
  saved?: boolean;
  defaults?: {
    id?: string;
    fullName?: string;
    mobile?: string;
    email?: string | null;
    employeeCode?: string | null;
    isActive?: boolean;
    projectIds?: string[];
  };
  submitLabel: string;
  backHref?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef("");
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const selected = new Set(defaults?.projectIds ?? []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const t = window.setTimeout(() => {
      baselineRef.current = snapshotForm(form);
      setDirty(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [defaults?.id]);

  const markDirty = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    setDirty(snapshotForm(form) !== baselineRef.current);
  }, []);

  useEffect(() => {
    if (!backHref || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [backHref, dirty]);

  function requestLeave(href: string) {
    if (!backHref || !dirty) {
      router.push(href);
      return;
    }
    pendingHref.current = href;
    setLeaveOpen(true);
  }

  return (
    <>
      {backHref ? (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => requestLeave(backHref)}
            className="rounded-lg p-2 text-primary hover:bg-canvas"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={action}
        className="space-y-3"
        onInput={markDirty}
        onChange={markDirty}
      >
        {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}

        {error && ERRORS[error] ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {ERRORS[error]}
          </p>
        ) : null}
        {saved ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
            Agent saved.
          </p>
        ) : null}

        <div className="surface overflow-hidden p-0">
          <div className="grid gap-x-3 gap-y-3 p-4 sm:grid-cols-6 sm:p-5">
            <Field label="Full name" required className="sm:col-span-3">
              <input
                name="fullName"
                required
                defaultValue={defaults?.fullName ?? ""}
                className={inputCls}
                placeholder="Ramesh Kumar"
              />
            </Field>

            <Field label="Mobile" required className="sm:col-span-3">
              <input
                name="mobile"
                required
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                defaultValue={defaults?.mobile ?? ""}
                className={inputCls}
                placeholder="9876543210"
              />
            </Field>

            <Field label="Email" className="sm:col-span-3">
              <input
                name="email"
                type="email"
                defaultValue={defaults?.email ?? ""}
                className={inputCls}
                placeholder="agent@bhairava.com"
              />
            </Field>

            <Field label="Employee code" className="sm:col-span-3">
              <input
                name="employeeCode"
                defaultValue={defaults?.employeeCode ?? ""}
                className={inputCls}
                placeholder="AG-001"
              />
            </Field>

            <label className="flex items-center gap-2.5 self-end rounded-xl border border-border/80 bg-canvas px-3.5 py-3 text-sm font-semibold text-foreground sm:col-span-3">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={defaults?.isActive ?? true}
                className="h-4 w-4 rounded border-border text-primary focus:ring-brand"
              />
              Active agent
            </label>
          </div>
        </div>

        <div className="surface overflow-hidden p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Project assignment
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Select projects this agent can sell.</p>

          {projects.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              No projects yet.{" "}
              <Link href="/admin/projects/new" className="font-semibold text-primary">
                Create a project
              </Link>{" "}
              first.
            </div>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-white px-3.5 py-3 transition hover:border-primary/30 hover:bg-[var(--surface-low)]/40 has-[:checked]:border-primary/40 has-[:checked]:bg-[var(--surface-low)]/60">
                    <input
                      type="checkbox"
                      name="projectIds"
                      value={p.id}
                      defaultChecked={selected.has(p.id)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-brand"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">{p.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {p.code}
                        {p.city ? ` · ${p.city}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="btn-primary w-full py-3 sm:w-auto sm:px-8">
          {submitLabel}
        </button>
      </form>

      {leaveOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--bhairava-deep)]/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="agent-leave-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 id="agent-leave-title" className="text-base font-bold text-foreground">
              Unsaved changes
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Save before leaving, or discard edits?</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                className="btn-primary flex-1 px-3.5 py-2.5"
                onClick={() => {
                  setLeaveOpen(false);
                  formRef.current?.requestSubmit();
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="btn-secondary flex-1 px-3.5 py-2.5"
                onClick={() => {
                  const href = pendingHref.current;
                  setLeaveOpen(false);
                  if (href) router.push(href);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
