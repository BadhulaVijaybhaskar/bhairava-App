import { createApiClient, type TokenStore } from '@bhairava/api-client';

const ACCESS = 'bhairava.admin.access';
const REFRESH = 'bhairava.admin.refresh';

/** Auth tokens only — never persist business entities here. */
export const tokens: TokenStore = {
  getAccessToken: async () => sessionStorage.getItem(ACCESS),
  getRefreshToken: async () => sessionStorage.getItem(REFRESH),
  setTokens: async (access: string, refresh?: string | null) => {
    sessionStorage.setItem(ACCESS, access);
    if (refresh) sessionStorage.setItem(REFRESH, refresh);
    else sessionStorage.removeItem(REFRESH);
  },
  clear: async () => {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  },
};

export const api = createApiClient({
  baseUrl: (import.meta as any).env.VITE_API_BASE_URL || '',
  tokens,
  onUnauthorized: () => {
    void tokens.clear();
    if (location.pathname !== '/login') location.href = '/login';
  },
});