# Deployment

## Local (developer)

```bash
# 1) Infra
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio

# 2) Schema + data
npm run db:migrate:deploy
npm run db:seed          # demo only
# OR production-like: npm run db:bootstrap

# 3) API + worker
cp services/api/.env.example services/api/.env
npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker

# 4) Web
npm run dev -w @bhairava/admin-web
npm run dev -w @bhairava/agent-web
npm run dev -w @bhairava/customer-web
```

## Docker images

- `infrastructure/Dockerfile.api`
- `infrastructure/Dockerfile.worker`
- Full stack optional via compose `api` / `worker` services

## Production checklist

- [ ] Real JWT secrets + `COOKIE_SECURE=true`
- [ ] Managed Postgres + Redis + S3
- [ ] Founder bootstrap (no demo seed)
- [ ] Migrations applied once
- [ ] `/api/ready` green
- [ ] Backup schedule (`docs/BACKUP_RESTORE.md`)
- [ ] Mobile signing credentials (if shipping stores)

**No external deploy performed in Wave 3** (user constraint).
