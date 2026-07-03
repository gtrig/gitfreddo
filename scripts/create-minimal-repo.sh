#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="$ROOT/test/fixtures/minimal-repo"

if [[ -d "$FIXTURE/.git" ]]; then
  exit 0
fi

mkdir -p "$FIXTURE"
cd "$FIXTURE"
git init -b main -q
git config user.email "fixture@test.local"
git config user.name "Fixture"
echo "initial" > README.md
git add README.md
git commit -q -m "Initial commit"
git branch feature
echo "feature" >> README.md
git checkout -q feature
git add README.md
git commit -q -m "Feature commit"
git checkout -q main
