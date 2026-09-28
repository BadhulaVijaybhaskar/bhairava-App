import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export type GoogleSignInButtonProps = {
  clientId?: string;
  /** Called with the Google ID token (credential JWT). */
  onCredential: (idToken: string) => void | Promise<void>;
  /** Optional label override. */
  label?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Dev-only: when true, also show a neutral “Continue with Google (local)” control
   * that emits a `dev.<payload>` token for API GOOGLE_AUTH_DEV_BYPASS.
   * Callers MUST gate this with VITE_GOOGLE_AUTH_DEV_BYPASS && !PROD.
   * Never enable solely because clientId is missing.
   */
  allowDevBypass?: boolean;
  /**
   * When true and clientId is missing (and allowDevBypass is false), render a
   * controlled unavailable message instead of a fake Google button.
   */
  requireClientIdInProduction?: boolean;
  unavailableMessage?: string;
  /** Prefill for local bypass identity. */
  devEmail?: string;
  devName?: string;
};

/**
 * Google Sign-In is the only intentional non-brand (blue) control.
 * Brand greens must not restyle this button.
 */
export function GoogleSignInButton({
  clientId,
  onCredential,
  label = "Continue with Google",
  className,
  disabled,
  allowDevBypass = false,
  requireClientIdInProduction = true,
  unavailableMessage = "Google sign-in is temporarily unavailable. Please contact Bhairava.",
  devEmail = "new.customer@example.com",
  devName = "New Customer",
}: GoogleSignInButtonProps) {
  const hostId = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const [gisError, setGisError] = useState("");
  const [busy, setBusy] = useState(false);

  const canUseGis = Boolean(clientId);
  const canUseDev = Boolean(allowDevBypass);
  const unavailable = !canUseGis && !canUseDev && requireClientIdInProduction;

  useEffect(() => {
    if (!clientId || disabled) return;
    let cancelled = false;

    function handleCredential(response: { credential?: string }) {
      if (!response.credential || cancelled) return;
      void onCredential(response.credential);
    }

    function mountButton() {
      if (!window.google?.accounts?.id || !hostRef.current || cancelled) return;
      hostRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        ux_mode: "popup",
      });
      window.google.accounts.id.renderButton(hostRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: hostRef.current.clientWidth || 320,
      });
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-bhairava-gis="1"]');
    if (existing) {
      if (window.google?.accounts?.id) mountButton();
      else existing.addEventListener("load", mountButton);
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.bhairavaGis = "1";
    script.onload = () => mountButton();
    script.onerror = () => {
      if (!cancelled) setGisError("Google Sign-In failed to load.");
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential]);

  async function onDevContinue() {
    if (!allowDevBypass) {
      setGisError(unavailableMessage);
      return;
    }
    setBusy(true);
    setGisError("");
    try {
      const identity = {
        sub: `dev-${devEmail}`,
        email: devEmail,
        emailVerified: true,
        name: devName,
      };
      const token = `dev.${btoa(JSON.stringify(identity)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
      await onCredential(token);
    } catch (e: any) {
      setGisError(e?.message || "Dev Google continue failed");
    } finally {
      setBusy(false);
    }
  }

  if (unavailable) {
    return (
      <div className={cn("space-y-3", className)} data-testid="google-sign-in-unavailable">
        <p role="status" className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm text-foreground">
          {unavailableMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} data-testid="google-sign-in">
      {canUseGis ? (
        <div
          id={`gis-${hostId}`}
          ref={hostRef}
          className="flex min-h-11 w-full justify-center [&iframe]:!w-full"
          aria-label={label}
        />
      ) : canUseDev ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void onDevContinue()}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] disabled:opacity-60"
          data-testid="google-sign-in-dev-primary"
        >
          <GoogleGIcon />
          {label} (local)
        </button>
      ) : null}
      {canUseDev && canUseGis ? (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void onDevContinue()}
          className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          data-testid="google-sign-in-dev"
        >
          Local Google continue (dev)
        </button>
      ) : null}
      {gisError ? (
        <p role="alert" className="text-sm text-destructive">
          {gisError}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
