# Runbook

## Start stack (dev)

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
npm run db:migrate:deploy
npm run db:seed
npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker
```

Demo logins: `founder@bhairava.demo` / `admin@bhairava.demo` / `agent@bhairava.demo` / `customer@bhairava.demo` — password `Demo@12345`.

## Health checks

```bash
curl -s http://localhost:4000/api/health
curl -s http://localhost:4000/api/ready
```

## Common incidents

| Symptom | Check |
|---------|-------|
| `/ready` not_ready db | Postgres up? `DATABASE_URL`? |
| `/ready` redis down | Redis up? `REDIS_URL`? |
| Login 401 | Seed/bootstrap run? Suspended? |
| Reserve 409 | Expected under contention — one winner |
| Refresh 401 reuse | Stolen/replayed refresh — family revoked; re-login |
| Documents 403 | Visibility vs role |
| Docker pipe error | Start Docker Desktop engine — see `docs/DOCKER_VERIFICATION.md` |

## Reservation expiry

Worker sweeps BullMQ queue `reservation-expiry` every 60s. If worker down, ACTIVE reservations past `expiresAt` linger until worker resumes (API should still reject convert of expired via `evaluateReservationState`).

## E2E smoke

```bash
npm run test:e2e:api
```

If Docker/API down → prints `NEEDS ENV VERIFICATION` (exit 0).
