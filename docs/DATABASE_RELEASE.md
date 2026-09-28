# Database Release Process

## Source of truth

- Prisma schema: `packages/database/prisma/schema.prisma`
- Migrations: `packages/database/prisma/migrations/`
- Commands (workspace root):
  - `npm run db:migrate:deploy` ? apply pending migrations (CI/CD / prod)
  - `npm run db:migrate` ? interactive migrate:dev (local only)
  - `npm run db:validate` / `npm run db:generate`

## Pre-migration checklist

1. Backup Postgres (`docs/BACKUP_RESTORE.md` / `scripts/backup/`)
2. Verify migration status: `npx prisma migrate status` in `packages/database`
3. Confirm target env (`DATABASE_URL`) ? never point prod tools at staging by accident
4. Announce maintenance window if locking expected

## Deploy

```bash
# From monorepo root, with production DATABASE_URL in env
npm run db:migrate:deploy -w @bhairava/database
```

API/worker should roll out **after** migrations succeed (expand/contract friendly migrations preferred).

## Production Founder bootstrap

```bash
# NEVER run demo seed in production
export NODE_ENV=production
export ALLOW_FOUNDER_BOOTSTRAP=yes
export FOUNDER_EMAIL=...
export FOUNDER_PASSWORD='...strong-unique-12plus...'
export DATABASE_URL=...
npm run db:bootstrap -w @bhairava/database
```

Guardrails: refuses without `ALLOW_FOUNDER_BOOTSTRAP`; rejects `Demo@12345` and weak passwords.

## Seeds

| Env | Seed |
|-----|------|
| development | `npm run db:seed` OK |
| staging | optional with `ALLOW_DEMO_SEED=yes` and `NODE_ENV!=production` |
| production | **FORBIDDEN** ? seed script exits if `NODE_ENV=production` |

## Rollback / recovery

1. Restore from pre-migration dump (`scripts/backup/pg_restore.sh`)
2. Re-run `db:migrate:deploy` only to the known-good migration set if restoring empty DB
3. Verify `/api/ready` and smoke auth
4. Document incident; do not "fix forward" destructive data loss without Founder approval

## Verification

- `prisma migrate status` ? Database schema is up to date
- `/api/health` liveness, `/api/ready` DB+Redis
