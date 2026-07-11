#!/usr/bin/env bash
# Point git directly at the tracked scripts/hooks/ directory via
# core.hooksPath, instead of copying hook files into .git/hooks/.
#
# The old approach (copy scripts/hooks/* into .git/hooks/) requires
# re-running this script every time a hook changes, or the live hook goes
# stale silently — which is exactly what happened here: a hook fix was
# committed to scripts/hooks/pre-commit, but .git/hooks/pre-commit (a copy
# made before the fix) kept being used until someone remembered to re-run
# `npm run prepare`. Using core.hooksPath means git always runs the tracked
# file directly, so an edit takes effect on the very next commit — no
# install step to forget, ever.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

HOOKS_SRC_DIR="$ROOT/scripts/hooks"
if [[ ! -d "$HOOKS_SRC_DIR" ]]; then
  exit 0
fi

# Resolve the legacy (copy-based) hooks directory BEFORE changing
# core.hooksPath below — `git rev-parse --git-path hooks` reflects whatever
# core.hooksPath is *currently* set to, so computing it after the change
# would just point back at scripts/hooks and skip cleanup entirely.
LEGACY_HOOKS_DIR="$ROOT/$(git -C "$ROOT" rev-parse --git-path hooks)"

chmod +x "$HOOKS_SRC_DIR"/* 2>/dev/null || true
git -C "$ROOT" config core.hooksPath "$HOOKS_SRC_DIR"

# Remove stale copies from the old copy-based setup, if any, so there's no
# ambiguity about which file is actually in effect (git only reads
# core.hooksPath once it's set, but a leftover copy is confusing to find).
if [[ -d "$LEGACY_HOOKS_DIR" && "$LEGACY_HOOKS_DIR" != "$HOOKS_SRC_DIR" ]]; then
  for hook in "$HOOKS_SRC_DIR"/*; do
    [[ -f "$hook" ]] || continue
    name="$(basename "$hook")"
    if [[ -f "$LEGACY_HOOKS_DIR/$name" && ! -L "$LEGACY_HOOKS_DIR/$name" ]]; then
      rm -f "$LEGACY_HOOKS_DIR/$name"
    fi
  done
fi
