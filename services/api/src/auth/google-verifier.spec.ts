import { encodeDevGoogleToken, DevBypassGoogleVerifier, createGoogleTokenVerifier } from './google-verifier';

describe('Google token verifier', () => {
  it('dev bypass accepts encoded identity when enabled', async () => {
    const v = new DevBypassGoogleVerifier(true);
    const token = encodeDevGoogleToken({
      sub: 'sub-1',
      email: 'Person@Example.COM',
      emailVerified: true,
      name: 'Person',
    });
    const id = await v.verify(token, 'dev');
    expect(id.email).toBe('person@example.com');
    expect(id.sub).toBe('sub-1');
  });

  it('createGoogleTokenVerifier never enables bypass in production', () => {
    const v = createGoogleTokenVerifier({
      NODE_ENV: 'production',
      GOOGLE_AUTH_DEV_BYPASS: 'true',
    });
    expect(v.constructor.name).toBe('GoogleAuthLibraryVerifier');
  });
});
