# Environment

See root `.env.example`, `services/api/.env.example`, `services/worker/.env.example`.

## Required (API)

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Postgres connection |
| `REDIS_URL` | BullMQ / ready check |
| `JWT_ACCESS_SECRET` | ≥32 chars |
| `JWT_REFRESH_SECRET` | ≥32 chars |
| `PII_ENCRYPTION_KEY` | 64 hex chars |
| `COOKIE_SECURE` | `true` in production |
| `S3_*` | MinIO/S3 for documents |

## Founder bootstrap

| Variable | Required |
|----------|----------|
| `FOUNDER_EMAIL` | yes |
| `FOUNDER_PASSWORD` | yes (≥10) |
| `FOUNDER_ORG_NAME` | no |
| `FOUNDER_ORG_CODE` | no |
| `FOUNDER_DISPLAY_NAME` | no |

## Validation

Runtime: `services/api/src/common/env/env.schema.ts` — warn in development, fail-closed in production.
