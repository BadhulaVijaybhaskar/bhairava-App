# Production Migration Status

**Branch:** `feat/production-platform`  
**Baseline:** `bd342fe` / client-test baseline (do not rewrite)  
**Updated:** 2026-09-24 IST (Wave 3)

## Wave 1 — DONE

| Phase | Item | Status |
|------:|------|--------|
| 0 | Freeze / baseline tag | DONE |
| 1 | Monorepo workspaces | DONE |
| 2–4 | Nest API + Prisma schema + enums | DONE |
| 5–6 | Auth + RBAC | DONE |
| 7–9 | Reserve FOR UPDATE + book + BullMQ expiry | DONE |
| 10–12 | Finance soft-void, storage stub, PII | DONE |
| 23–25 | env examples, docker compose, seed | DONE (hardened in Wave 3) |

## Wave 2 — DONE

Phases 13–19: layout domain, admin/agent/customer web cores, Expo mobiles + SecureStore, typed api-client, Nest CRUD expansion. See prior revision / git history through `494a5a8`.

## Wave 3 — DONE (ops / hardening / docs)

| Phase | Item | Status |
|------:|------|--------|
| 20 | Immutable audit API | DONE |
| 21 | Notifications + provider stubs | DONE |
| 22 | Observability /health /ready | DONE |
| 23–25 | Env schema, founder bootstrap, seed personas | DONE |
| 24 | Docker smoke vs real DB | **BLOCKED** — engine down (`docs/DOCKER_VERIFICATION.md`) |
| 26–28 | Expanded automated tests | DONE (44 API + 14 domain) |
| 27 | Production E2E script | DONE — marks NEEDS ENV when API down |
| 29 | Mobile EAS readiness | Config ready; **signing BLOCKED BY EXTERNAL CREDENTIAL** |
| 30 | Backup/restore docs + scripts | DONE |
| 31 | Documentation suite | DONE |
| — | Final report | `docs/PRODUCTION_MIGRATION_FINAL_REPORT.md` |

## Constraints honored

- No push / no external deploy
- MAIN* and baseline commit preserved
- No production tokens in localStorage/AsyncStorage
- Never trust client `organizationId`
- Demo passwords only in seeds
- Never delete failing tests to greenwash

## Start commands

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
npm run db:migrate:deploy && npm run db:seed
npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker
npm run dev -w @bhairava/admin-web
npm run test:e2e:api
```
