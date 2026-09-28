# Bhairava Land Sales OS

Production platform monorepo on branch `feat/production-platform`.

**Client-test behavioral SoT (until cutover proven):** `MAIN app/`, `MAIN-agent/`, `MAIN-customer/`, `MAIN-agent-expo/`, `MAIN-customer-expo/`.

## Quick start (production stack)

```bash
# Infra (requires Docker Desktop engine running)
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio

npm install
npm run db:migrate:deploy
npm run db:seed                 # demo only — NOT for production
# production-like founder:
#   FOUNDER_EMAIL=... FOUNDER_PASSWORD=... npm run db:bootstrap

cp services/api/.env.example services/api/.env
npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker

npm run dev -w @bhairava/admin-web      # :5173
npm run dev -w @bhairava/agent-web      # :5174
npm run dev -w @bhairava/customer-web   # :5175
```

Demo: `founder@bhairava.demo` / `Demo@12345` (also admin@, finance@, viewer@, agent@, agent2@, customer@, customer2@).

## Workspace layout

| Path | Package |
|------|---------|
| `services/api` | NestJS API |
| `services/worker` | Reservation expiry worker |
| `packages/database` | Prisma |
| `packages/domain` | Pure domain rules |
| `packages/permissions` | RBAC matrix |
| `packages/api-client` | Typed client |
| `apps/*-web` | Vite admin/agent/customer |
| `apps/*-mobile` | Expo agent/customer |

## Docs

- `docs/PRODUCTION_ARCHITECTURE.md`
- `docs/DATABASE.md` · `docs/API.md` · `docs/SECURITY.md`
- `docs/ENVIRONMENT.md` · `docs/DEPLOYMENT.md` · `docs/RUNBOOK.md`
- `docs/BACKUP_RESTORE.md` · `docs/MOBILE_BUILD.md`
- `docs/PRODUCTION_MIGRATION_STATUS.md`
- `docs/PRODUCTION_MIGRATION_FINAL_REPORT.md`
- History: `docs/architecture/`, `architecture/`

## Tests

```bash
npm run test:domain    # 14 domain tests
npm run test:api       # Jest API unit/rules
npm run test:e2e:api   # live API flow (NEEDS ENV if Docker down)
```

## Client-test MAIN app (legacy demo)

```bash
cd "MAIN app"
bun run dev -- --host 0.0.0.0 --port 8080
```

Constraints for this migration branch: **no push**, **no external deploy**.
