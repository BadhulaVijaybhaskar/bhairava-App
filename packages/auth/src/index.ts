/**
 * Auth interfaces shared by API + clients.
 * Web: httpOnly Secure cookies for refresh (SameSite=Lax/Strict) + short-lived access JWT in memory.
 * Expo: SecureStore for refresh token; access JWT in memory / SecureStore with biometric optional.
 * Never commit real secrets — demo users only in seed.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export interface AuthUser {
  id: string;
  organizationId: string;
  email: string | null;
  mobile: string | null;
  displayName: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface TokenStorage {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory stub for tests / web session layer. */
export class MemoryTokenStorage implements TokenStorage {
  private refresh: string | null = null;
  async getRefreshToken() { return this.refresh; }
  async setRefreshToken(token: string) { this.refresh = token; }
  async clear() { this.refresh = null; }
}

export const AUTH_COOKIE = {
  refreshName: 'bhairava_refresh',
  optionsDoc: 'httpOnly; Secure (prod); SameSite=Lax; Path=/; Max-Age=refresh TTL',
} as const;
