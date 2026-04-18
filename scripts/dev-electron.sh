#!/usr/bin/env bash
# Espera a Vite en 5173 y arranca Electron (usado por npm run dev / ./start.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-development}"

WAIT_ON="$ROOT/node_modules/.bin/wait-on"
ELECTRON_BIN="$ROOT/node_modules/.bin/electron"

if [[ ! -x "$WAIT_ON" ]]; then
  echo "[TorchForge] Falta wait-on. Ejecuta: npm install"
  exit 1
fi
if [[ ! -x "$ELECTRON_BIN" ]]; then
  echo "[TorchForge] Falta electron. Ejecuta: npm install"
  exit 1
fi

echo "[TorchForge] Esperando a Vite en tcp:127.0.0.1:5173 …"
"$WAIT_ON" -t 120000 -v tcp:127.0.0.1:5173

if [[ ! -f dist-electron/main.js ]]; then
  echo "[TorchForge] Falta dist-electron/main.js. Ejecuta: npm run predev"
  exit 1
fi

echo "[TorchForge] Iniciando Electron…"
exec "$ELECTRON_BIN" .
