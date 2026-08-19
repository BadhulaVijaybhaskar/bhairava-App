"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { maskAadhaar, maskPan } from "@/lib/auth/crypto";
import { CustomerEmailField } from "@/components/customers/customer-email-field";

const ERRORS: Record<string, string> = {
  required: "Name, mobile, email, address, city, state, and pincode are required.",
  mobile: "Enter a valid 10-digit mobile number.",
  email: "Enter a valid email address.",
  altmobile: "Alternate mobile must be 10 digits.",
  nomineemobile: "Nominee mobile must be 10 digits.",
  duplicate: "A customer with this mobile already exists.",
  pan: "Enter a valid PAN (e.g. ABCDE1234F).",
  aadhaar: "Enter a valid 12-digit Aadhaar number.",
  pincode: "Enter a valid 6-digit pincode.",
};

const KYC_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

function Field({
  label,
  hint,
  required,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
          {required ? (
            <span className="ml-0.5 text-[11px] font-bold text-red-500" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {hint ? <span className="text-[10px] font-medium text-muted-foreground">{hint}</span> : null}
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

export function CustomerForm({
  action,
  error,
  saved,
  defaults,
  submitLabel,
  backHref,
}: {
  action: (formData: FormData) => Promise<void>;
  error?: string;
  saved?: boolean;
  defaults?: {
    id?: string;
    fullName?: string;
    mobile?: string;
    alternateMobile?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    panLast4?: string | null;
    aadhaarLast4?: string | null;
    kycStatus?: string;
    nomineeName?: string | null;
    nomineeRelation?: string | null;
    nomineeMobile?: string | null;
    supportNotes?: string | null;
  };
  submitLabel: string;
  /** When set, leaving with unsaved edits shows Save / Discard */
  backHref?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef("");
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    // After mount (and email field hydrate), capture baseline
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
            Customer saved.
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
                placeholder="Ravi Kumar"
              />
            </Field>
            <Field label="Mobile" required className="sm:col-span-2">
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
            <Field label="Alt. mobile" hint="optional" className="sm:col-span-1">
              <input
                name="alternateMobile"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                defaultValue={defaults?.alternateMobile ?? ""}
                className={inputCls}
                placeholder="—"
              />
            </Field>
            <CustomerEmailField
              defaultValue={defaults?.email ?? ""}
              inputClassName={inputCls}
            />
            <Field label="Address" required className="sm:col-span-3">
              <input
                name="address"
                required
                defaultValue={defaults?.address ?? ""}
                className={inputCls}
                placeholder="House / street"
              />
            </Field>
            <Field label="City" required className="sm:col-span-2">
              <input
                name="city"
                required
                defaultValue={defaults?.city ?? ""}
                className={inputCls}
                placeholder="Visakhapatnam"
              />
            </Field>
            <Field label="State" required className="sm:col-span-2">
              <input
                name="state"
                required
                defaultValue={defaults?.state ?? ""}
                className={inputCls}
                placeholder="Andhra Pradesh"
              />
            </Field>
            <Field label="Pincode" required className="sm:col-span-2">
              <input
                name="pincode"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                defaultValue={defaults?.pincode ?? ""}
                className={inputCls}
                placeholder="530001"
              />
            </Field>

            <Field
              label="PAN"
              hint={defaults?.panLast4 ? `kept ${maskPan(defaults.panLast4)}` : undefined}
              className="sm:col-span-2"
            >
              <input
                name="pan"
                className={`${inputCls} uppercase`}
                placeholder={defaults?.panLast4 ? "New PAN to replace" : "ABCDE1234F"}
                maxLength={10}
              />
            </Field>
            <Field
              label="Aadhaar"
              hint={defaults?.aadhaarLast4 ? `kept ${maskAadhaar(defaults.aadhaarLast4)}` : undefined}
              className="sm:col-span-2"
            >
              <input
                name="aadhaar"
                inputMode="numeric"
                className={inputCls}
                placeholder={defaults?.aadhaarLast4 ? "New Aadhaar to replace" : "12 digits"}
                maxLength={12}
              />
            </Field>
            <Field label="KYC status" className="sm:col-span-2">
              <select
                name="kycStatus"
                defaultValue={defaults?.kycStatus ?? "PENDING"}
                className={inputCls}
              >
                {KYC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nominee name" hint="optional" className="sm:col-span-2">
              <input
                name="nomineeName"
                defaultValue={defaults?.nomineeName ?? ""}
                className={inputCls}
                placeholder="—"
              />
            </Field>
            <Field label="Nominee relation" hint="optional" className="sm:col-span-2">
              <input
                name="nomineeRelation"
                defaultValue={defaults?.nomineeRelation ?? ""}
                className={inputCls}
                placeholder="Spouse / Parent"
              />
            </Field>
            <Field label="Nominee mobile" hint="optional" className="sm:col-span-2">
              <input
                name="nomineeMobile"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                defaultValue={defaults?.nomineeMobile ?? ""}
                className={inputCls}
                placeholder="—"
              />
            </Field>

            <Field label="Internal notes" hint="team only" className="sm:col-span-6">
              <textarea
                name="supportNotes"
                rows={2}
                defaultValue={defaults?.supportNotes ?? ""}
                className={`${inputCls} !h-auto resize-y py-2`}
                placeholder="Anything the team should know…"
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-canvas/50 px-4 py-3 sm:px-5">
            <button type="submit" className="btn-primary min-w-[160px] px-5 py-2.5 text-sm">
              {submitLabel}
            </button>
          </div>
        </div>
      </form>

      {leaveOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[var(--bhairava-deep)]/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-title"
          onClick={() => setLeaveOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="unsaved-title" className="text-base font-semibold text-foreground">
              Save changes?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You changed customer details. Save them, or discard and leave without saving.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary px-4 py-2.5 text-sm"
                onClick={() => {
                  setLeaveOpen(false);
                  const href = pendingHref.current ?? backHref;
                  pendingHref.current = null;
                  setDirty(false);
                  if (href) router.push(href);
                }}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn-primary px-4 py-2.5 text-sm"
                onClick={() => {
                  setLeaveOpen(false);
                  pendingHref.current = null;
                  formRef.current?.requestSubmit();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
