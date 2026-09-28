import type { AppRole } from "@/lib/domain/project-permissions";
import { normalizeRole } from "@/lib/domain/project-permissions";

const SESSION_KEY = "bhairava.session.v1";
const AUTH_COOKIE = "bhairava.auth";

function writeAuthCookie(value: "1" | "0") {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function hasSignedOutCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === `${AUTH_COOKIE}=0`);
}

function clearSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Stable client-test Admin identities (local mock auth — never real PII). */
export const DEMO_ACCOUNTS = [
  { email: "founder@bhairava.com", password: "founder@2026", name: "Vijay Founder", role: "Founder" as const satisfies AppRole },
  { email: "admin@bhairava.com", password: "admin@2026", name: "Vijay Bhaskar", role: "Administrator" as const satisfies AppRole },
  { email: "finance@bhairava.com", password: "finance@2026", name: "Suresh Finance", role: "Finance" as const satisfies AppRole },
  { email: "viewer@bhairava.com", password: "viewer@2026", name: "Anil Viewer", role: "Viewer" as const satisfies AppRole },
] as const;

/** Back-compat primary demo used on login placeholder copy */
export const DEMO_ADMIN = DEMO_ACCOUNTS.find((a) => a.email === "admin@bhairava.com")!;

export type SessionRole = AppRole;

export interface Session {
  email: string;
  name: string;
  role: SessionRole;
}

function readStorage(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.email) return null;
    return {
      email: parsed.email,
      name: parsed.name || DEMO_ADMIN.name,
      role: normalizeRole(parsed.role),
    };
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  return isAuthenticated() ? readStorage() : null;
}

export function isAuthenticated(): boolean {
  if (hasSignedOutCookie()) {
    clearSessionStorage();
    return false;
  }
  return readStorage() !== null;
}

export function signIn(email: string, password: string): Session | null {
  const e = email.trim().toLowerCase();
  const match = DEMO_ACCOUNTS.find((a) => a.email === e && a.password === password);
  if (!match) return null;
  const session: Session = {
    email: match.email,
    name: match.name,
    role: match.role,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  writeAuthCookie("1");
  return session;
}

/** Demo helper — switch role without leaving the session (MAIN permission UX). */
export function setSessionRole(role: SessionRole): Session | null {
  const current = getSession();
  if (!current) return null;
  const next: Session = { ...current, role: normalizeRole(role) };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  writeAuthCookie("1");
  return next;
}

export function signOut() {
  writeAuthCookie("0");
  clearSessionStorage();
}
