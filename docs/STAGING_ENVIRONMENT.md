# Staging Environment Contract

Staging is completely separate from development and production.

## Services

| Service | Role |
|---------|------|
| Postgres | Primary data store (dedicated staging DB) |
| Redis | BullMQ / session helpers / ready checks |
| S3-compatible | Documents / object storage |
| API (`@bhairava/api`) | Nest HTTP API |
| Worker (`@bhairava/worker`) | Background jobs (reservation expiry, etc.) |
| Admin web | Founder/Admin/Finance/Viewer |
| Agent web + mobile | Agent surfaces |
| Customer web + mobile | Customer surfaces |

## Env templates

- Root: `.env.staging.example`
- API: copy staging values into `services/api/.env` (never commit)
- Worker: `services/worker/.env`
- Web: `apps/*-web/.env.production.example` with staging hosts
- Mobile: `apps/*-mobile/.env.production.example`

**Never reuse** development JWT secrets, MinIO `minioadmin`, `Demo@12345`, or production keys.

## Required variables (API)

See `.env.staging.example`. Critical:

- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (?32, unique to staging)
- `PII_ENCRYPTION_KEY` (64 hex, unique to staging)
- `COOKIE_SECURE=true`
- `CORS_ORIGINS` allowlist of staging Admin/Agent/Customer origins
- `S3_*` staging bucket credentials

## Domains

Use distinct hostnames, e.g.:

- `https://admin.staging.example.com`
- `https://agent.staging.example.com`
- `https://customer.staging.example.com`
- `https://api.staging.example.com`

No hardcoded production hostnames in app source ? configure via env (`VITE_API_URL`, `EXPO_PUBLIC_API_URL`, `CORS_ORIGINS`).

## Data

- Optional demo seed: `ALLOW_DEMO_SEED=yes` with `NODE_ENV=staging` (never `production`)
- Prefer founder bootstrap + curated UAT fixtures when demo seed is undesirable

## Notifications

In-app works. Email/SMS/WhatsApp/Push without credentials return **BLOCKED BY EXTERNAL CREDENTIAL**.
