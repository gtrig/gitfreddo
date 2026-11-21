#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/test/fixtures/push-repo"
BARE="$ROOT/test/fixtures/push-remote.git"
BACKUP="$ROOT/test/fixtures/push-backup.git"

rm -rf "$FIXTURE" "$BARE" "$BACKUP"
mkdir -p "$(dirname "$FIXTURE")"

git init --bare "$BARE"
git init --bare "$BACKUP"
git init -b main "$FIXTURE"
git -C "$FIXTURE" config user.email "test@example.com"
git -C "$FIXTURE" config user.name "Test"
git -C "$FIXTURE" remote add origin "$BARE"
git -C "$FIXTURE" remote add backup "$BACKUP"
echo "# push fixture" > "$FIXTURE/README.md"
git -C "$FIXTURE" add README.md
git -C "$FIXTURE" commit -m "initial"
git -C "$FIXTURE" push -u origin main
echo "ahead change" >> "$FIXTURE/README.md"
git -C "$FIXTURE" add README.md
git -C "$FIXTURE" commit -m "ahead commit"

echo "Push fixture ready at $FIXTURE (1 commit ahead of origin; second remote: backup)"
