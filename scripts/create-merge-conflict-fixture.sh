#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/test/fixtures/merge-conflict-repo"

rm -rf "$FIXTURE"
mkdir -p "$FIXTURE"

git init -b main "$FIXTURE"
git -C "$FIXTURE" config user.email "test@example.com"
git -C "$FIXTURE" config user.name "Test"
echo "base" > "$FIXTURE/file.txt"
git -C "$FIXTURE" add file.txt
git -C "$FIXTURE" commit -m "initial"
git -C "$FIXTURE" branch side
echo "main change" > "$FIXTURE/file.txt"
git -C "$FIXTURE" commit -am "main change"
git -C "$FIXTURE" switch side
echo "side change" > "$FIXTURE/file.txt"
git -C "$FIXTURE" commit -am "side change"
git -C "$FIXTURE" switch main
git -C "$FIXTURE" merge side || true

echo "Merge conflict fixture ready at $FIXTURE"
