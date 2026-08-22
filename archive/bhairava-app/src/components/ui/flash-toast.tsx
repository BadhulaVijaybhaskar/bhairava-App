"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Brief toast that auto-dismisses and strips flash query params from the URL
 * so banners don't stick on refresh / back-nav.
 */
export function FlashToast({
  message,
  variant = "success",
  clearParams = ["followSaved", "followError", "saved"],
  durationMs = 3200,
}: {
  message: string;
  variant?: "success" | "error";
  clearParams?: string[];
  durationMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Clear sticky query params immediately so reload doesn't keep the banner
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of clearParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const next = `${pathname}${url.search ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
      router.replace(next, { scroll: false });
    }

    const t = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(t);
  }, [clearParams, durationMs, pathname, router]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-5 left-1/2 z-[90] flex max-w-[min(92vw,24rem)] -translate-x-1/2 items-start gap-2 rounded-xl px-3.5 py-3 text-sm font-medium shadow-lg",
        variant === "success" && "border border-emerald-200 bg-emerald-50 text-emerald-800",
        variant === "error" && "border border-red-200 bg-red-50 text-red-800",
      )}
      role="status"
    >
      {variant === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
      ) : null}
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
