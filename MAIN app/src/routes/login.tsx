import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand";
import { useState } from "react";

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

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("vijay@bhairava.in");
  const [password, setPassword] = useState("");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--secondary)_22%,transparent),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[420px] -translate-x-1/2 hairline-gold" />
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center pb-10">
          <BrandLogo size={64} className="rounded-2xl" />
          <h1 className="pt-6 font-display text-2xl font-semibold">Sign in to Bhairava</h1>
          <p className="pt-2 text-sm text-muted-foreground">Internal access for Astranova staff</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Work email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg bg-surface-low px-3 text-sm outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-11 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
            />
          </label>
          <button
            type="submit"
            className="gradient-primary h-11 w-full rounded-lg text-sm font-medium text-primary-foreground"
          >
            Continue
          </button>
        </form>

        <p className="pt-8 text-center text-xs text-muted-foreground">
          Access is restricted and every action is recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
