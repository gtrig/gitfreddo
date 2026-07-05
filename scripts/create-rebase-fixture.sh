#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/test/fixtures/rebase-repo"

rm -rf "$FIXTURE"
mkdir -p "$FIXTURE"

git init -b main "$FIXTURE"
git -C "$FIXTURE" config user.email "test@example.com"
git -C "$FIXTURE" config user.name "Test"

for i in 1 2 3 4; do
  echo "commit $i" > "$FIXTURE/file-$i.txt"
  git -C "$FIXTURE" add "file-$i.txt"
  git -C "$FIXTURE" commit -m "commit $i"
done

echo "Linear rebase fixture ready at $FIXTURE"
