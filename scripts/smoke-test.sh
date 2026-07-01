#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cd "$TMPDIR"
git init -q smoke-repo
cd smoke-repo
git config user.email "smoke@test.local"
git config user.name "Smoke Test"

echo "initial" > README.md
git add README.md
git commit -q -m "Initial commit"
git branch feature
MAIN="$(git branch --show-current)"
echo "feature" >> README.md
git checkout -q feature
git add README.md
git commit -q -m "Feature commit"
git checkout -q "$MAIN"

# working tree ops smoke
echo "untracked" > untracked.txt
git clean -fdn | grep -q untracked.txt
echo "tracked" > tracked.txt
git add tracked.txt
git commit -q -m "Add tracked"
git rm -q tracked.txt

echo "Smoke repo ready at $TMPDIR/smoke-repo"
echo "Run GitFreddo and open that path, or use npm run dev after build."

# Quick node smoke of git-runner if built
if [[ -f "$ROOT/out/main/index.js" ]]; then
  echo "Build output found — manual UI smoke recommended."
else
  echo "Tip: npm run build && npm run dev to test the UI."
fi

echo "OK"
