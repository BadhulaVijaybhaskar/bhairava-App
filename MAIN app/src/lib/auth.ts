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

export const DEMO_ADMIN = {
  email: "admin@bhairava.com",
  password: "admin@2026",
  name: "Vijay Bhaskar",
  role: "Administrator",
} as const;

export interface Session {
  email: string;
  name: string;
  role: string;
}

function readStorage(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.email) return null;
    return parsed;
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
  if (e !== DEMO_ADMIN.email || password !== DEMO_ADMIN.password) return null;
  const session: Session = {
    email: DEMO_ADMIN.email,
    name: DEMO_ADMIN.name,
    role: DEMO_ADMIN.role,
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  writeAuthCookie("1");
  return session;
}

export function signOut() {
  writeAuthCookie("0");
  clearSessionStorage();
}
