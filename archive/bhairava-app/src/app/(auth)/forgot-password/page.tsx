"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setResetUrl("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Request failed");
        return;
      }
      setMessage(data.data.message);
      if (data.data.resetUrl) setResetUrl(data.data.resetUrl);
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface w-full max-w-md p-8">
        <BrandLogo size={64} isTarget />
        <h1 className="font-display mt-4 text-center text-2xl font-semibold text-primary">Forgot Password</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Enter your email or mobile</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-field !pl-10"
              placeholder="Email or mobile number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {resetUrl ? (
            <p className="text-xs break-all text-muted-foreground">
              Dev reset link:{" "}
              <Link href={resetUrl} className="text-primary underline">
                {resetUrl}
              </Link>
            </p>
          ) : null}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <Link href="/login" className="block text-center text-sm text-primary font-medium">
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}
