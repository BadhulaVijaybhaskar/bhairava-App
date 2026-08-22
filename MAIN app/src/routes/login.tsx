import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand";
import { signIn } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Bhairava Land Sales OS" },
      { name: "description", content: "Administrator sign-in for the Bhairava land sales operating system." },
      { property: "og:title", content: "Sign in — Bhairava Land Sales OS" },
      { property: "og:description", content: "Administrator sign-in for Bhairava's internal sales platform." },
    ],
  }),
  component: LoginPage,
});

function later(label: string) {
  toast.message(`${label} comes next`, {
    description: "Email, password and this demo login are live. Forgot password and Google sign-up will be wired later.",
  });
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_22%,transparent),transparent)]"
      />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2 hairline-gold" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center pb-8">
          <BrandLogo size={64} className="rounded-2xl" />
          <h1 className="pt-6 font-display text-2xl font-semibold">Sign in to Bhairava</h1>
          <p className="pt-2 text-center text-sm text-muted-foreground">Land Sales OS · internal access</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setSubmitting(true);
            const session = signIn(email, password);
            setSubmitting(false);
            if (!session) {
              setError("Email or password is incorrect.");
              return;
            }
            void navigate({ to: "/" });
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="admin@bhairava.com"
              className="mt-1.5 h-11 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              Password
              <button
                type="button"
                onClick={() => later("Forgot password")}
                className="font-medium text-primary"
              >
                Forgot password?
              </button>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              className="mt-1.5 h-11 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
            />
          </label>

          {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="gradient-primary h-11 w-full rounded-lg text-sm font-medium text-primary-foreground disabled:opacity-70"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 py-5">
          <span className="h-px flex-1 bg-outline-variant/40" />
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">or</span>
          <span className="h-px flex-1 bg-outline-variant/40" />
        </div>

        <button
          type="button"
          onClick={() => later("Sign up with Google")}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-surface-low text-sm font-medium text-foreground transition-colors active:bg-surface-c"
        >
          <GoogleMark />
          Sign up with Google
        </button>
        <p className="pt-2 text-center text-[11px] text-muted-foreground">Google sign-up will be set up later.</p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.9v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.04l3.07-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.96l3.07 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
