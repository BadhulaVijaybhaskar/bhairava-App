import { validateEnv } from './env.schema';

describe('env schema', () => {
  const base = {
    DATABASE_URL: 'postgresql://bhairava:bhairava@localhost:5432/bhairava',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
    PII_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  };

  it('accepts valid development env', () => {
    const r = validateEnv({ ...base, NODE_ENV: 'development' });
    expect(r.ok).toBe(true);
    expect(r.config.PORT).toBe(4000);
  });

  it('rejects short JWT secrets', () => {
    const r = validateEnv({ ...base, JWT_ACCESS_SECRET: 'short' });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.key === 'JWT_ACCESS_SECRET')).toBe(true);
  });

  it('rejects non-hex PII key', () => {
    const r = validateEnv({ ...base, PII_ENCRYPTION_KEY: 'not-hex' });
    expect(r.ok).toBe(false);
  });

  it('fails production on change-me secrets', () => {
    const r = validateEnv({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'change-me-access-dev-only-32chars-min',
      JWT_REFRESH_SECRET: 'change-me-refresh-dev-only-32chars-min',
      COOKIE_SECURE: 'true',
    });
    expect(r.ok).toBe(false);
  });

  it('requires COOKIE_SECURE in production', () => {
    const r = validateEnv({
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'p'.repeat(32),
      JWT_REFRESH_SECRET: 'q'.repeat(32),
      COOKIE_SECURE: 'false',
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.key === 'COOKIE_SECURE')).toBe(true);
  });
});
