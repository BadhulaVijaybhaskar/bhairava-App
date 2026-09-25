# Database

## Stack

- PostgreSQL 16 (Docker image `postgres:16-alpine`)
- Prisma schema: `packages/database/prisma/schema.prisma`
- Migrations: `packages/database/prisma/migrations/`

## Commands

```bash
npm run db:generate
npm run db:migrate          # dev
npm run db:migrate:deploy   # prod/CI
npm run db:seed             # DEMO only
npm run db:bootstrap        # Founder only (env FOUNDER_*)
```

## Founder vs demo

| Script | Purpose |
|--------|---------|
| `prisma/bootstrap/founder.ts` | Production-safe org + FOUNDER user from env |
| `prisma/seed.ts` | Demo personas (agent1/2, customer1/2, plots, INTERNAL doc) |

Never run demo seed against production.

## Key uniqueness

- Plot: `@@unique([projectId, number])`
- Org email: `@@unique([organizationId, email])`
- Agent: `userId @unique`, `@@unique([organizationId, code])`
- One active sellable layout polygon per plot (enforced in domain + API)

## Backup

See `docs/BACKUP_RESTORE.md`.
