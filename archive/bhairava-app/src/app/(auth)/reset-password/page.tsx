"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Reset failed");
        return;
      }
      setMessage(data.data.message);
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <input
        className="input-field !pl-3"
        placeholder="Reset token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        required
      />
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="input-field !pl-10"
          type="password"
          placeholder="New password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Updating..." : "Reset Password"}
      </button>
      <Link href="/login" className="block text-center text-sm text-primary font-medium">
        Back to Login
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface w-full max-w-md p-8">
        <BrandLogo size={64} isTarget />
        <h1 className="font-display mt-4 text-center text-2xl font-semibold text-primary">Reset Password</h1>
        <Suspense fallback={<p className="mt-8 text-sm text-muted-foreground">Loading...</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
