import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { assertEnvOrThrow, validateEnv } from './common/env/env.schema';
import { structuredLog } from './common/logging/logger';

function parseCorsOrigins(): boolean | string[] {
  const raw = (process.env.CORS_ORIGINS || process.env.WEB_ORIGINS || '').trim();
  if (!raw || raw === '*') {
    // Development convenience only ? production must set an allowlist
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGINS must be a comma-separated allowlist in production');
    }
    return true;
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function applySecurityHeaders(req: any, res: any, next: () => void) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (isProd) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // HTTPS enforcement hint for reverse proxies that honor it
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      // Do not redirect here (API behind LB); reject cleartext API calls in prod
      res.status(400).json({ message: 'HTTPS required' });
      return;
    }
  }
  next();
}

async function bootstrap() {
  const envCheck = validateEnv();
  if (!envCheck.ok) {
    structuredLog('warn', 'env_validation_issues', {
      issues: envCheck.issues,
      note: 'Boot continues in non-production; production would fail closed',
    });
    if (process.env.NODE_ENV === 'production') {
      assertEnvOrThrow();
    }
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  // Request size limits (JSON / urlencoded). Multipart upload limits enforced in storage module.
  app.use(json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
  app.use(urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '1mb' }));
  app.use(cookieParser());
  app.use(applySecurityHeaders);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id'],
  });
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  structuredLog('info', 'api_listening', {
    port,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cors: process.env.CORS_ORIGINS || '(dev reflect)',
  });
}
bootstrap();
