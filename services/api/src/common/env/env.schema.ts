/**
 * Runtime env validation — fail fast on boot for production-critical vars.
 * Demo/dev may run with documented defaults; production must set real secrets.
 */

export type EnvSchema = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SEC: number;
  JWT_REFRESH_TTL_SEC: number;
  COOKIE_SECURE: boolean;
  PII_ENCRYPTION_KEY: string;
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY?: string;
  S3_SECRET_KEY?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  THROTTLE_TTL_MS: number;
  THROTTLE_LIMIT: number;
  CORS_ORIGINS?: string;
  ADMIN_WEB_URL?: string;
  AGENT_WEB_URL?: string;
  CUSTOMER_WEB_URL?: string;
  API_PUBLIC_URL?: string;
  MOBILE_API_URL?: string;
  MAX_UPLOAD_BYTES?: number;
};

export type EnvIssue = { key: string; message: string };

function req(name: string, value: string | undefined, issues: EnvIssue[]) {
  if (!value || !String(value).trim()) {
    issues.push({ key: name, message: 'required' });
    return '';
  }
  return String(value).trim();
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): {
  ok: boolean;
  config: Partial<EnvSchema>;
  issues: EnvIssue[];
} {
  const issues: EnvIssue[] = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const DATABASE_URL = req('DATABASE_URL', env.DATABASE_URL, issues);
  const REDIS_URL = req('REDIS_URL', env.REDIS_URL, issues);
  const JWT_ACCESS_SECRET = req('JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET, issues);
  const JWT_REFRESH_SECRET = req('JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET, issues);
  const PII_ENCRYPTION_KEY = req('PII_ENCRYPTION_KEY', env.PII_ENCRYPTION_KEY, issues);

  if (JWT_ACCESS_SECRET && JWT_ACCESS_SECRET.length < 32) {
    issues.push({ key: 'JWT_ACCESS_SECRET', message: 'must be at least 32 characters' });
  }
  if (JWT_REFRESH_SECRET && JWT_REFRESH_SECRET.length < 32) {
    issues.push({ key: 'JWT_REFRESH_SECRET', message: 'must be at least 32 characters' });
  }
  if (PII_ENCRYPTION_KEY && !/^[0-9a-fA-F]{64}$/.test(PII_ENCRYPTION_KEY)) {
    issues.push({ key: 'PII_ENCRYPTION_KEY', message: 'must be 64 hex chars (32 bytes)' });
  }
  if (isProd) {
    if (/change-me|dev-only|demo/i.test(JWT_ACCESS_SECRET + JWT_REFRESH_SECRET)) {
      issues.push({ key: 'JWT_*_SECRET', message: 'production must not use change-me/dev-only secrets' });
    }
    if (env.COOKIE_SECURE !== 'true') {
      issues.push({ key: 'COOKIE_SECURE', message: 'must be true in production' });
    }
    const cors = (env.CORS_ORIGINS || '').trim();
    if (!cors || cors === '*') {
      issues.push({ key: 'CORS_ORIGINS', message: 'production requires explicit comma-separated allowlist' });
    }
    if (/minioadmin|Demo@12345/i.test(JSON.stringify({
      s3: env.S3_ACCESS_KEY || '',
      s3s: env.S3_SECRET_KEY || '',
    }))) {
      issues.push({ key: 'S3_*', message: 'production must not use MinIO demo credentials' });
    }
  }

  const config: EnvSchema = {
    NODE_ENV: nodeEnv,
    PORT: Number(env.PORT || 4000),
    DATABASE_URL,
    REDIS_URL,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    JWT_ACCESS_TTL_SEC: Number(env.JWT_ACCESS_TTL_SEC || 900),
    JWT_REFRESH_TTL_SEC: Number(env.JWT_REFRESH_TTL_SEC || 604800),
    COOKIE_SECURE: env.COOKIE_SECURE === 'true',
    PII_ENCRYPTION_KEY,
    S3_ENDPOINT: env.S3_ENDPOINT,
    S3_ACCESS_KEY: env.S3_ACCESS_KEY,
    S3_SECRET_KEY: env.S3_SECRET_KEY,
    S3_BUCKET: env.S3_BUCKET,
    S3_REGION: env.S3_REGION || 'us-east-1',
    THROTTLE_TTL_MS: Number(env.THROTTLE_TTL_MS || 60_000),
    THROTTLE_LIMIT: Number(env.THROTTLE_LIMIT || 60),
    CORS_ORIGINS: env.CORS_ORIGINS,
    ADMIN_WEB_URL: env.ADMIN_WEB_URL,
    AGENT_WEB_URL: env.AGENT_WEB_URL,
    CUSTOMER_WEB_URL: env.CUSTOMER_WEB_URL,
    API_PUBLIC_URL: env.API_PUBLIC_URL,
    MOBILE_API_URL: env.MOBILE_API_URL,
    MAX_UPLOAD_BYTES: Number(env.MAX_UPLOAD_BYTES || 10_485_760),
  };

  return { ok: issues.length === 0, config, issues };
}

export function assertEnvOrThrow(env: NodeJS.ProcessEnv = process.env) {
  const result = validateEnv(env);
  if (!result.ok) {
    const detail = result.issues.map((i) => `${i.key}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${detail}`);
  }
  return result.config as EnvSchema;
}
