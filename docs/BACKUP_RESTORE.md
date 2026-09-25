# Backup & Restore

**Updated:** 2026-09-24 IST

## Postgres

### Dump

```bash
# Linux/macOS
export DATABASE_URL=postgresql://bhairava:bhairava@localhost:5432/bhairava
./scripts/backup/pg_dump.sh

# Windows (PowerShell, pg_dump on PATH)
$env:DATABASE_URL="postgresql://bhairava:bhairava@localhost:5432/bhairava"
./scripts/backup/pg_dump.ps1
```

Produces `backups/bhairava_pg_YYYYMMDD_HHMMSS.dump` (custom format).

### Restore

```bash
./scripts/backup/pg_restore.sh backups/bhairava_pg_YYYYMMDD_HHMMSS.dump
```

**Warning:** `--clean --if-exists` drops objects in the target DB. Never point at production without change control.

### After restore

```bash
npm run db:migrate:deploy
# optionally re-seed demo ONLY on non-prod:
# npm run db:seed
```

## MinIO / object storage

See `scripts/backup/minio_notes.md`. Prefer `mc mirror` or cloud-native bucket replication. Binary blobs are not in Postgres.

## Migration rollback strategy

1. **Forward-only preference:** Prisma migrations are append-only; prefer a new forward migration to fix bad schema.
2. **Point-in-time:** Restore `pg_dump` taken *before* the bad migrate deploy, then re-apply known-good migrations.
3. **Manual down SQL:** Only if a migration includes a documented down section (current migrations are up-only). Do not invent destructive downs in production without backup verification.
4. **App rollback:** Redeploy previous API image/commit that matches the restored schema generation (`@prisma/client`).

## Verification checklist

- [ ] Dump file size > 0 and `pg_restore --list` shows tables
- [ ] `/api/ready` returns ready after restore + migrate
- [ ] Founder/admin login works
- [ ] Spot-check reservation/booking rows
- [ ] MinIO objects reachable for a sample document key


## Operational schedule (production)

| Item | Policy |
|------|--------|
| Full Postgres dump | Daily (off-peak IST) via `scripts/backup/pg_dump.*` or managed snapshot |
| Retention | 30 daily + 12 monthly (adjust per compliance) |
| Pre-migration | Mandatory dump before `db:migrate:deploy` |
| S3 / documents | Bucket versioning + cross-region replication preferred; see `scripts/backup/minio_notes.md` |
| Restore drill | Quarterly: restore to isolated DB, run migrate status, hit `/api/ready`, spot-check receipt PDF + auth |
| Verification | Compare row counts for payments/receipts/bookings; open one receipt PDF |

Never run restore against production without change control and Founder approval.
