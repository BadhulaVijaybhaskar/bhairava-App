const SESSION_KEY = "bhairava.session.v1";
export const AUTH_COOKIE = "bhairava.auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function writeAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; Path=/; SameSite=Lax; Max-Age=${AUTH_COOKIE_MAX_AGE}`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0`;
}

function hasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => part.trim() === `${AUTH_COOKIE}=1`);
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
  return readStorage();
}

export function isAuthenticated(): boolean {
  const stored = readStorage();
  if (stored) {
    if (!hasAuthCookie()) writeAuthCookie();
    return true;
  }
  return hasAuthCookie();
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
  writeAuthCookie();
  return session;
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  clearAuthCookie();
}
