/** Vite base path without trailing slash, e.g. /app/agent */
export const APP_BASE = String(((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL) || '/').replace(/\/$/, '') || '';

export function appPath(path: string): string {
  const p = path.startsWith('/') ? path : '/' + path;
  return APP_BASE ? APP_BASE + p : p;
}

/** Public asset under Vite base (e.g. /app/agent/branding/...). */
export function assetPath(path: string): string {
  return appPath(path);
}

/** Basename-aware brand logo for AppShell / BrandWordmark. */
export const LOGO_SRC = assetPath('/branding/bhairava-logo.png');

export function isAppLoginPath(pathname: string): boolean {
  return pathname === appPath('/login') || pathname === '/login' || pathname.endsWith('/login');
}
