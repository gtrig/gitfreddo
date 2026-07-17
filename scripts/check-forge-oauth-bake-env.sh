#!/usr/bin/env bash
# Fail release builds when forge OAuth bake env is empty (Actions secrets missing/misnamed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/run-ts.sh" "$ROOT/scripts/check-forge-oauth-bake-env.ts"
