# Production Architecture

**Branch:** `feat/production-platform`  
**Updated:** 2026-09-24 IST

## Overview

Bhairava production platform is a monorepo:

| Layer | Path | Role |
|-------|------|------|
| Nest API | `services/api` | Auth, RBAC, domain APIs, audit, notifications |
| Worker | `services/worker` | BullMQ reservation expiry |
| Database | `packages/database` | Prisma schema + migrations + seed/bootstrap |
| Domain | `packages/domain` | Pure business rules (plot transitions, PII, layout) |
| Permissions | `packages/permissions` | Role → permission matrix |
| API client | `packages/api-client` | Typed fetch client for web/mobile |
| Admin / Agent / Customer web | `apps/*-web` | Vite React apps |
| Agent / Customer mobile | `apps/*-mobile` | Expo + SecureStore |

**Client-test SoT (until cutover proven):** `MAIN app`, `MAIN-agent`, `MAIN-customer`, `MAIN-*-expo`.

Prior architecture notes preserved under `docs/architecture/` and `architecture/`.

## Runtime topology

```
Browser / Expo  →  Nest API (:4000)  →  Postgres
                       │                    ↑
                       ├─ Redis/BullMQ  →  Worker
                       └─ MinIO/S3 (documents)
```

## Hard rules

- Never trust client `organizationId` — bind from JWT principal.
- No production tokens in localStorage/AsyncStorage (httpOnly refresh cookie web; SecureStore mobile).
- Audit history append-only via API.
- Financial rows soft-void only.
- Reserve/book use `SELECT … FOR UPDATE` inside transactions.
- Never log passwords, tokens, full PAN/Aadhaar.

## Health

- `GET /api/health` — liveness
- `GET /api/ready` — DB + Redis readiness
