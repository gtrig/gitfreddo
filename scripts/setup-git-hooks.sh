#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

git -C "$ROOT" config --unset core.hooksPath 2>/dev/null || true

HOOKS_SRC_DIR="$ROOT/scripts/hooks"
if [[ ! -d "$HOOKS_SRC_DIR" ]]; then
  exit 0
fi

HOOKS_DIR="$ROOT/$(git -C "$ROOT" rev-parse --git-path hooks)"
mkdir -p "$HOOKS_DIR"

for hook in "$HOOKS_SRC_DIR"/*; do
  [[ -f "$hook" ]] || continue
  install -m 755 "$hook" "$HOOKS_DIR/$(basename "$hook")"
done
