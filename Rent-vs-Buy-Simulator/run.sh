#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi

exec npm run dev -- --host 0.0.0.0 --port "${PORT:-5173}"
