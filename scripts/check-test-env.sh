#!/usr/bin/env bash
# Fast pre-flight guard for the test runner environment.
#
# We've repeatedly hit two classes of failure that only show up as a wall of
# duplicated "Unhandled Error" stack traces from deep inside jsdom's
# transitive dependencies, after minutes of test output:
#   1. The active Node.js version doesn't match .nvmrc (git hooks and some
#      shells don't inherit nvm/fnm state), so tests run on a Node version
#      that can't require() certain ESM-only transitive deps.
#   2. A dependency bump (jsdom, html-encoding-sniffer, whatwg-url, ...)
#      silently pulls in @exodus/bytes or another pure-ESM package that
#      jsdom's CJS code tries to require(), crashing every jsdom test file.
#
# This script checks both up front, in well under a second, so a broken
# environment fails fast with an actionable message instead of a 40s test
# run followed by 40+ copies of the same cryptic stack trace.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() {
  echo "" >&2
  echo "✖ $1" >&2
  echo "" >&2
  exit 1
}

# --- 1. Node version must match .nvmrc -------------------------------------
# Avoid sed/tr here: this script also runs on Windows CI runners via Git
# Bash, where we want zero dependency on external Unix tools being on PATH.
if [[ -f "$ROOT/.nvmrc" ]]; then
  REQUIRED_NODE="$(cat "$ROOT/.nvmrc")"
  REQUIRED_NODE="${REQUIRED_NODE//[$'\t\r\n ']/}"
  ACTUAL_NODE="$(node --version)"
  ACTUAL_NODE="${ACTUAL_NODE#v}"

  # Compare major version only (.nvmrc may pin an exact patch, but a
  # matching major is what actually matters for module resolution).
  REQUIRED_MAJOR="${REQUIRED_NODE%%.*}"
  ACTUAL_MAJOR="${ACTUAL_NODE%%.*}"

  if [[ "$REQUIRED_MAJOR" != "$ACTUAL_MAJOR" ]]; then
    fail "Node.js version mismatch: .nvmrc wants v$REQUIRED_NODE (major v$REQUIRED_MAJOR), but 'node' on PATH is v$ACTUAL_NODE.
  Run one of:
    nvm use          # if you use nvm
    fnm use          # if you use fnm
  then retry. Running tests on the wrong major Node version is the #1 cause
  of cryptic jsdom/ESM 'Unhandled Error' floods in this repo."
  fi
else
  echo "⚠ No .nvmrc found; skipping Node version check." >&2
fi

# --- 2. jsdom's CJS require chain must not pull in pure-ESM packages ------
# @exodus/bytes (and anything shaped like it: "type": "module", no "main")
# cannot be require()'d on Node < 22.12, and even on newer Node some releases
# of its consumers (whatwg-url, html-encoding-sniffer) have shipped with
# latent bugs. The only reliable guard is a canary require + instantiate.
CANARY_OUTPUT="$(node -e "
try {
  const { JSDOM } = require('jsdom');
  new JSDOM('<!doctype html><html></html>');
  process.stdout.write('OK');
} catch (err) {
  process.stdout.write('FAIL: ' + (err && err.stack ? err.stack : String(err)));
}
" 2>&1 || true)"

if [[ "$CANARY_OUTPUT" != "OK" ]]; then
  fail "jsdom failed to load/instantiate in this environment:
  $CANARY_OUTPUT

  This usually means a dependency bump reintroduced a pure-ESM transitive
  dependency (e.g. @exodus/bytes) into jsdom's require() chain, or jsdom
  itself was bumped to a version with a broken whatwg-url/webidl-conversions
  release. Check with:
    npm ls @exodus/bytes
    npm ls jsdom html-encoding-sniffer whatwg-url webidl-conversions
  jsdom is pinned to an exact version in package.json for this reason —
  do not bump it without re-running this check under both the minimum
  supported Node version and the .nvmrc version."
fi

echo "✓ Test environment OK (Node $(node --version), jsdom loads cleanly)."
