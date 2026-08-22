"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ identifier, password, rememberMe: remember }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-shell flex min-h-dvh flex-col bg-white px-6 pb-8 pt-12">
      <div className="flex flex-1 flex-col justify-center">
        <BrandLogo size={72} />
        <p className="mt-3 text-center text-[13px] font-semibold text-[var(--brand)]">
          Bhairava Real Estate
        </p>
        <p className="mt-0.5 text-center text-[11px] text-[var(--muted)]">Management System</p>

        <h1 className="mt-8 text-center text-[22px] font-bold text-[var(--ink)]">Welcome Back</h1>
        <p className="mt-1 text-center text-[13px] text-[var(--muted)]">Sign in to continue</p>

        <form onSubmit={onSubmit} className="mt-7 space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
            <input
              className="m-input"
              type="email"
              placeholder="Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-soft)]" />
            <input
              className="m-input !pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--muted-soft)]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[12px]">
            <label className="flex items-center gap-2 text-[var(--muted)]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              Remember Me
            </label>
            <span className="font-medium text-[var(--brand)] opacity-70">Forgot Password?</span>
          </div>

          {error ? <p className="text-[13px] text-[var(--danger)]">{error}</p> : null}

          <button type="submit" disabled={loading} className="m-btn mt-2">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
      <p className="text-center text-[11px] text-[var(--muted-soft)]">
        © {new Date().getFullYear()} Bhairava Real Estate
      </p>
    </div>
  );
}
