#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -d venv ]]; then
  echo "venv not found. Run ./setup.sh first."
  exit 1
fi

# shellcheck disable=SC1091
source venv/bin/activate

export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"

uvicorn backend.main:app --host 127.0.0.1 --port 7433 --reload &
UV_PID=$!

cleanup() {
  kill "$UV_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 1

export NODE_ENV=development
npm run dev
