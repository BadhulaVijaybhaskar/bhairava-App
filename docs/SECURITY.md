# Security

## Authentication

- Argon2id password hashes
- Short-lived JWT access + rotating refresh tokens (hashed at rest)
- Refresh reuse detection revokes entire token family + sessions
- Suspended users cannot login/refresh
- Web: httpOnly refresh cookie (`path=/api/auth`); access token in memory
- Mobile: Expo SecureStore — never AsyncStorage for tokens

## Authorization

Chain: auth → org (from JWT) → permission → project/ownership → field projection (PII).

Notable denials:

- Viewer: no mutate (setup/plots/sales/finance operate)
- Finance: no setup/plot master edit
- Agent: no plot master / setup / audit.view; customers scoped to agentId
- Customer: no INTERNAL docs; own bookings/payments only
- Cross-org: resource org must match actor org (404, not 403 leakage)

## PII

- AES-256-GCM at rest (`PII_ENCRYPTION_KEY` 64 hex chars)
- Domain `projectCustomerPii` redacts unrelated agent views
- Audit/logger redact password/token/PAN/Aadhaar

## Audit

Append-only. API rejects POST/PATCH/PUT/DELETE on `/api/audit*`.

## Secrets

- Never commit real secrets
- Production env validation fails on `change-me` JWT secrets and `COOKIE_SECURE!=true`


## Security headers (API)

Applied in `services/api/src/main.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Content-Security-Policy` (API default-src none)
- `Strict-Transport-Security` in production
- HTTPS-only cleartext rejection when `x-forwarded-proto` present in production
- CORS allowlist via `CORS_ORIGINS` (required in production)
- JSON body limit (`JSON_BODY_LIMIT`, default 1mb)
- Global throttling (`THROTTLE_*`)
- Cookies: HttpOnly, Secure when `COOKIE_SECURE=true`, SameSite via `COOKIE_SAMESITE`
