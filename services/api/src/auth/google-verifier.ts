/**
 * Google ID token verification.
 * Production uses google-auth-library; tests inject a fake verifier.
 * Dev bypass (GOOGLE_AUTH_DEV_BYPASS=true, never in production) accepts
 * tokens shaped as `dev.<base64url(JSON{sub,email,name,email_verified})>`.
 */

export type GoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

export interface GoogleTokenVerifier {
  verify(idToken: string, audience: string | string[]): Promise<GoogleIdentity>;
}

export class DevBypassGoogleVerifier implements GoogleTokenVerifier {
  constructor(private readonly enabled: boolean) {}

  async verify(idToken: string, _audience: string | string[]): Promise<GoogleIdentity> {
    if (!this.enabled) {
      throw new Error('Dev Google bypass is disabled');
    }
    if (!idToken.startsWith('dev.')) {
      throw new Error('Invalid dev Google token');
    }
    const raw = idToken.slice(4);
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as Partial<GoogleIdentity>;
    if (!payload.sub || !payload.email) {
      throw new Error('Dev Google token missing sub/email');
    }
    return {
      sub: String(payload.sub),
      email: String(payload.email).trim().toLowerCase(),
      emailVerified: payload.emailVerified !== false,
      name: payload.name ? String(payload.name) : undefined,
    };
  }
}

export function encodeDevGoogleToken(identity: GoogleIdentity): string {
  const body = Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url');
  return `dev.${body}`;
}

/** Lazy-loaded production verifier so unit tests need not install google-auth-library paths. */
export class GoogleAuthLibraryVerifier implements GoogleTokenVerifier {
  private client: { verifyIdToken: (args: { idToken: string; audience: string | string[] }) => Promise<{ getPayload: () => any }> } | null = null;

  private async getClient() {
    if (this.client) return this.client;
    // Dynamic import keeps optional at typecheck when package not yet installed in some workspaces.
    const mod = await import('google-auth-library');
    this.client = new mod.OAuth2Client() as any;
    return this.client!;
  }

  async verify(idToken: string, audience: string | string[]): Promise<GoogleIdentity> {
    const client = await this.getClient();
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error('Google token missing sub/email');
    }
    if (payload.email_verified === false) {
      throw new Error('Google email not verified');
    }
    return {
      sub: payload.sub,
      email: String(payload.email).trim().toLowerCase(),
      emailVerified: true,
      name: payload.name,
    };
  }
}

export function createGoogleTokenVerifier(env: {
  NODE_ENV?: string;
  GOOGLE_AUTH_DEV_BYPASS?: string;
}): GoogleTokenVerifier {
  const isProd = (env.NODE_ENV || 'development') === 'production';
  const bypass =
    !isProd &&
    ['1', 'true', 'yes'].includes(String(env.GOOGLE_AUTH_DEV_BYPASS || '').toLowerCase());
  if (bypass) return new DevBypassGoogleVerifier(true);
  return new GoogleAuthLibraryVerifier();
}
