#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

git -C "$ROOT" config --unset core.hooksPath 2>/dev/null || true

HOOK_SRC="$ROOT/scripts/hooks/pre-push"
if [[ ! -f "$HOOK_SRC" ]]; then
  exit 0
fi

HOOKS_DIR="$ROOT/$(git -C "$ROOT" rev-parse --git-path hooks)"
mkdir -p "$HOOKS_DIR"
install -m 755 "$HOOK_SRC" "$HOOKS_DIR/pre-push"
