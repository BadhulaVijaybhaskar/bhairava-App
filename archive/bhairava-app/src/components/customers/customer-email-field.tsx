"use client";

import { useState } from "react";
import { Check } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email field with verification UX scaffold.
 * NOW: green tick when a valid email is entered (no OTP yet).
 * LATER: open verify popup → enter code from mail → then tick.
 */
export function CustomerEmailField({
  defaultValue = "",
  inputClassName,
}: {
  defaultValue?: string;
  inputClassName: string;
}) {
  const [email, setEmail] = useState(defaultValue);
  // Future: set true only after OTP verify succeeds
  const looksVerified = EMAIL_RE.test(email.trim());

  return (
    <label className="block min-w-0 sm:col-span-3">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Email
          <span className="ml-0.5 text-[11px] font-bold text-red-500" aria-hidden>
            *
          </span>
        </span>
      </span>
      <div className="relative">
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClassName} pr-10`}
          placeholder="name@email.com"
          autoComplete="email"
        />
        {looksVerified ? (
          <span
            className="pointer-events-none absolute top-1/2 right-2.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white"
            title="Email ready (verification coming soon)"
            aria-label="Email looks valid"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      {/*
        Future verify UI (not active yet):
        - Button "Verify" next to email when entered
        - Modal: enter OTP from email
        - On success: set verified=true and keep green tick
      */}
    </label>
  );
}
