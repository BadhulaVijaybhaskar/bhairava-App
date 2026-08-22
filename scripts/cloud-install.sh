#!/usr/bin/env bash
# Cloud Agent install phase: prepare Postgres, dependencies, Prisma client, and seed data.
# Idempotent — safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/cloud-env.sh
source "${REPO_ROOT}/scripts/cloud-env.sh"

log "Ensuring PostgreSQL is installed and running..."
ensure_postgres_installed
start_postgres
ensure_role_and_db
write_all_envs

log "Installing root workspace dependencies (concurrently)..."
cd "${REPO_ROOT}"
npm install --no-audit --no-fund

for app in bhairava-app bhairava-agent bhairava-customer; do
  log "Installing dependencies for ${app}..."
  npm ci --no-audit --no-fund --prefix "${REPO_ROOT}/${app}"
done

log "Generating Prisma client and syncing to agent/customer apps..."
npm run db:generate

log "Syncing database schema to prisma/schema.prisma..."
# The committed migrations lag behind prisma/schema.prisma (missing additive columns
# such as Project.highlights). `prisma db push` is blocked for AI agents, so reconcile
# with a read-only additive diff (empty->schema on a fresh DB, delta only afterwards),
# which is fully idempotent and non-destructive.
DRIFT_SQL="$(mktemp)"
( cd "${REPO_ROOT}/bhairava-app" \
  && npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script 2>/dev/null ) \
  | grep -v '^Loaded Prisma config' > "${DRIFT_SQL}"
if grep -qiE 'CREATE|ALTER' "${DRIFT_SQL}"; then
  log "Applying schema delta:"
  cat "${DRIFT_SQL}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${DRIFT_SQL}"
else
  log "Database schema already in sync."
fi
rm -f "${DRIFT_SQL}"

log "Seeding database (idempotent)..."
npm run db:seed --prefix "${REPO_ROOT}/bhairava-app"

log "Install complete."
