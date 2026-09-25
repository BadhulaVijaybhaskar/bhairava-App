#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Bhairava root: $ROOT"
(cd "$ROOT/MAIN app" && npm run dev -- --host 0.0.0.0 --port 3000) &
(cd "$ROOT/MAIN-agent" && npm run dev -- --host 0.0.0.0) &
(cd "$ROOT/MAIN-customer" && npm run dev -- --host 0.0.0.0) &
echo "MAIN http://localhost:3000  Agent http://localhost:5174  Customer http://localhost:5175"
wait
