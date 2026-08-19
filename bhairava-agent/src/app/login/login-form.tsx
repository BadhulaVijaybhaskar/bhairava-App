"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { animate } from "animejs";
import { motion, useReducedMotion } from "motion/react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();
  const logoRef = useRef<HTMLDivElement>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (reduce || !logoRef.current) return;
    const anim = animate(logoRef.current, {
      opacity: [0, 1],
      y: [16, 0],
      scale: [0.92, 1],
      duration: 700,
      ease: "out(3)",
    });
    return () => {
      anim.pause();
    };
  }, [reduce]);

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
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mobile-shell flex min-h-dvh flex-col bg-[linear-gradient(180deg,#e8f7ee_0%,#f2f6f3_38%,#ffffff_100%)] px-5 pb-6 pt-10">
      <div className="flex flex-1 flex-col justify-center">
        <div ref={logoRef} style={reduce ? undefined : { opacity: 0 }}>
          <BrandLogo size={72} />
          <p className="mt-2.5 text-center text-[14px] font-bold tracking-tight text-primary">
            Bhairava Real Estate
          </p>
          <p className="mt-0.5 text-center text-[11px] text-muted-foreground">Management System</p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-7 text-center"
        >
          <h1 className="text-[24px] font-bold tracking-tight text-foreground">Welcome Back</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Sign in to continue</p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
        >
          <Card className="mt-6 border-border/80 shadow-sm">
            <CardContent className="space-y-3 p-4">
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 bg-white pl-10 text-[14px]"
                    type="text"
                    inputMode="email"
                    placeholder="Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 bg-white pr-10 pl-10 text-[14px]"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <span className="text-[12px] font-medium text-primary/80">Forgot Password?</span>
                </div>

                {error ? <p className="text-[13px] text-destructive">{error}</p> : null}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-[15px] font-semibold"
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>

                <label className="flex items-center gap-2 pt-0.5 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  Remember Me
                </label>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} RealEstate RMS
      </p>
    </div>
  );
}
