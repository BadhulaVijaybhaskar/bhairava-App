"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Phase = "loading" | "flying" | "done";

const SPLASH_SIZE = 120;
const MIN_SPIN_MS = 800;
const FLY_MS = 750;
const FADE_MS = 320;

function waitForLoad(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}

function waitForFonts(): Promise<void> {
  if (!("fonts" in document)) return Promise.resolve();
  return document.fonts.ready.then(() => undefined).catch(() => undefined);
}

function isAdminPath() {
  return window.location.pathname.startsWith("/admin");
}

function pickVisibleTarget(): HTMLElement | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-brand-logo-target='true']"),
  );
  return (
    nodes.find((el) => {
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }) ?? null
  );
}

function waitForTarget(timeoutMs = 10000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const found = pickVisibleTarget();
    if (found) {
      resolve(found);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const el = pickVisibleTarget();
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 50);
    };

    const obs = new MutationObserver(() => {
      const el = pickVisibleTarget();
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    tick();

    window.setTimeout(() => {
      obs.disconnect();
      resolve(pickVisibleTarget());
    }, timeoutMs);
  });
}

function frame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

function finishSplash(setPhase: (p: Phase) => void) {
  setPhase("done");
  document.documentElement.classList.remove("boot-splash-active");
  document.documentElement.classList.add("boot-splash-done");
}

export function BootSplash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [flyStyle, setFlyStyle] = useState<CSSProperties>({
    left: "50%",
    top: "50%",
    width: SPLASH_SIZE,
    height: SPLASH_SIZE,
    transform: "translate(-50%, -50%)",
  });
  const [spinning, setSpinning] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const startedAt = useRef(Date.now());
  const finishedRef = useRef(false);

  useEffect(() => {
    document.documentElement.classList.add("boot-splash-active");
    const admin = isAdminPath();
    setIsAdmin(admin);

    let cancelled = false;

    async function run() {
      const started = startedAt.current;

      await Promise.all([waitForLoad(), waitForFonts()]);
      if (cancelled) return;

      // Spin until real load finishes (no fixed short cutoff if load is slow)
      const elapsed = Date.now() - started;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      if (cancelled) return;

      // After login: spinning logo only, then fade — no brand name, no fly-to-logo
      if (admin) {
        setSpinning(false);
        setPhase("flying");
        window.setTimeout(() => {
          if (cancelled || finishedRef.current) return;
          finishedRef.current = true;
          finishSplash(setPhase);
        }, FADE_MS);
        return;
      }

      const target = await waitForTarget();
      if (cancelled) return;
      await frame();
      if (cancelled) return;

      if (!target) {
        setSpinning(false);
        setPhase("flying");
        window.setTimeout(() => {
          if (cancelled || finishedRef.current) return;
          finishedRef.current = true;
          finishSplash(setPhase);
        }, FADE_MS);
        return;
      }

      const rect = target.getBoundingClientRect();
      setSpinning(false);
      setPhase("flying");
      await frame();
      if (cancelled) return;

      setFlyStyle({
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        transform: "translate(-50%, -50%)",
        transition: `left ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1), height ${FLY_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      });

      window.setTimeout(() => {
        if (cancelled || finishedRef.current) return;
        finishedRef.current = true;
        finishSplash(setPhase);
      }, FLY_MS + 40);
    }

    run();

    return () => {
      cancelled = true;
      document.documentElement.classList.remove("boot-splash-active");
    };
  }, []);

  const overlayVisible = phase !== "done";
  const fadeMs = isAdmin ? FADE_MS : FLY_MS;

  return (
    <>
      {children}

      {overlayVisible ? (
        <div
          className={cn(
            "fixed inset-0 z-[100] bg-white",
            phase === "flying" && "pointer-events-none",
          )}
          style={{
            transition: `opacity ${fadeMs}ms ease`,
            opacity: phase === "flying" ? 0 : 1,
          }}
          aria-busy={phase === "loading"}
          aria-label="Loading"
        >
          {phase === "loading" && !isAdmin ? (
            <div className="absolute inset-x-0 bottom-[18%] flex flex-col items-center gap-2">
              <p className="font-display text-lg font-semibold tracking-tight text-primary">
                Bhairava Real Estate
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Loading
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {overlayVisible ? (
        <div
          className="fixed z-[110] will-change-[left,top,width,height]"
          style={{
            ...flyStyle,
            perspective: 1000,
            transition: phase === "flying" && isAdmin ? `opacity ${FADE_MS}ms ease` : undefined,
            opacity: phase === "flying" && isAdmin ? 0 : 1,
          }}
        >
          <div className={cn("h-full w-full", spinning && "logo-spin-y")}>
            <Image
              src="/branding/bhairava-logo.png"
              alt=""
              width={SPLASH_SIZE}
              height={SPLASH_SIZE}
              className="h-full w-full object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
