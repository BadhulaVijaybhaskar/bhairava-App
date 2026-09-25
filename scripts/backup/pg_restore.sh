#!/usr/bin/env bash
# Restore custom-format dump into DATABASE_URL. DESTRUCTIVE for target DB.
set -euo pipefail
DUMP=${1:-}
if [[ -z "$DUMP" ]]; then
  echo "Usage: $0 path/to/bhairava_pg_*.dump"
  exit 1
fi
echo "Restoring $DUMP into $DATABASE_URL"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$DUMP"
echo "OK restore complete"
