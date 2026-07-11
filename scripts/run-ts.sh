#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resolve_node() {
  if [ -f "$ROOT/.nvmrc" ]; then
    local wanted
    wanted="$(tr -d '[:space:]' < "$ROOT/.nvmrc")"
    wanted="${wanted#v}"

    for nvm_root in "${NVM_DIR:-$HOME/.nvm}"; do
      local candidate="$nvm_root/versions/node/v${wanted}/bin/node"
      if [ -x "$candidate" ]; then
        echo "$candidate"
        return 0
      fi
    done
  fi

  command -v node
}

NODE_BIN="$(resolve_node)"
NODE_MAJOR="$("$NODE_BIN" -p "Number(process.versions.node.split('.')[0])")"

if [ "$NODE_MAJOR" -lt 24 ]; then
  echo "GitFreddo scripts require Node.js 24+ (see .nvmrc). Current: $("$NODE_BIN" -v)" >&2
  exit 1
fi

if [ "$#" -lt 1 ]; then
  echo "usage: bash scripts/run-ts.sh <script.ts> [args...]" >&2
  exit 1
fi

exec "$NODE_BIN" --experimental-strip-types "$@"
