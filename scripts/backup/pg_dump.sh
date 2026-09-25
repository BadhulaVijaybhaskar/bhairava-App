#!/usr/bin/env bash
# Postgres logical backup. Requires DATABASE_URL or PG* vars.
set -euo pipefail
STAMP=$(date +%Y%m%d_%H%M%S)
OUT_DIR=${BACKUP_DIR:-./backups}
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/bhairava_pg_${STAMP}.dump"
echo "Dumping to $FILE"
pg_dump --format=custom --no-owner --no-acl --file="$FILE" "$DATABASE_URL"
echo "OK $FILE"
