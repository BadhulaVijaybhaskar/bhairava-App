#!/usr/bin/env bash
# Cloud Agent start phase: bring up Postgres on every boot.
# Must tolerate restarts and return promptly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/cloud-env.sh
source "${REPO_ROOT}/scripts/cloud-env.sh"

ensure_postgres_installed
start_postgres
ensure_role_and_db
log "Start complete — Postgres online on ${DB_HOST}:${DB_PORT}."
