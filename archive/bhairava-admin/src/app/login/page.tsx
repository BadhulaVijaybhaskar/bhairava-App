"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Login failed");
        return;
      }
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.replace(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

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

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Work email or mobile</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
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
              autoComplete="current-password"
              required
              className="mt-1.5 h-11 w-full rounded-lg bg-surface-low px-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-surface-lowest focus:ring-2 focus:ring-primary"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="gradient-primary h-11 w-full rounded-lg text-sm font-medium text-primary-foreground disabled:opacity-70"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <p className="pt-8 text-center text-xs text-muted-foreground">
          Access is restricted and every action is recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
