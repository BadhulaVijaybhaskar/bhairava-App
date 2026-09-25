import { createApiClient, createMemoryTokenStore } from '@bhairava/api-client';

/**
 * In-memory access token only. Refresh relies on the HTTP-only `bhairava_refresh`
 * cookie (credentials: 'include'). Never persist refresh tokens in localStorage.
 */
export const tokens = createMemoryTokenStore();

export const api = createApiClient({
  baseUrl: (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || '',
  tokens,
  onUnauthorized: () => {
    void tokens.clear();
    if (location.pathname !== '/login') location.href = '/login';
  },
});

/** After login, keep access in memory; drop any body refresh (cookie is SoT for web). */
export async function acceptSession(session: { accessToken: string; refreshToken?: string | null }) {
  await tokens.setTokens(session.accessToken, null);
}
