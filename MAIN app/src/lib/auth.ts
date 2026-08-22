const SESSION_KEY = "bhairava.session.v1";

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
  return session;
}

export function signOut() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
