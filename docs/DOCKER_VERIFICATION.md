# Docker Verification (Phase 24)

**Checked:** 2026-09-24 IST on user Windows machine `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5`

## Status: BLOCKED BY EXTERNAL — Docker Desktop engine not running

| Check | Result |
|-------|--------|
| Docker CLI installed | YES — Client 29.2.1 |
| Docker Desktop Linux engine | **NO** — `npipe:////./pipe/dockerDesktopLinuxEngine` missing |
| Compose file | Ready: `infrastructure/docker-compose.yml` |
| postgres / redis / minio smoke | **NOT RUN** (engine down) |
| migrate + seed against real DB | **NOT RUN** |
| API health + login + double-reserve | **NOT RUN** |

### Exact blocker

```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine;
check if the path is correct and if the daemon is running:
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

### Unblock steps (operator)

1. Start **Docker Desktop** on Windows and wait until engine is healthy.
2. Confirm: `docker info` shows Server section without pipe errors.
3. Then:

```bash
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
npm run db:migrate:deploy
npm run db:seed
npm run start:dev -w @bhairava/api
# smoke: GET /api/health , POST /api/auth/login , concurrent reserve
npm run test:e2e:api   # when DB up — see scripts/e2e
```

Compose remains ready; no redesign required.
