#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST="${OPENCODE_HOST:-127.0.0.1}"
PORT="${OPENCODE_PORT:-4096}"
BASE_URL="http://${HOST}:${PORT}"
OC_PID=""

cleanup() {
  if [ -n "$OC_PID" ] && kill -0 "$OC_PID" 2>/dev/null; then
    kill "$OC_PID" 2>/dev/null
    wait "$OC_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Find opencode binary — check local node_modules first, then PATH
OPENCODE=""
if [ -x "${SCRIPT_DIR}/node_modules/.bin/opencode" ]; then
  OPENCODE="${SCRIPT_DIR}/node_modules/.bin/opencode"
elif command -v opencode &>/dev/null; then
  OPENCODE="opencode"
fi

if [ -z "$OPENCODE" ]; then
  echo "Error: opencode not found." >&2
  echo "" >&2
  echo "Install it by running one of:" >&2
  echo "  npm install          (in this directory — installs as a dependency)" >&2
  echo "  npm install -g opencode-ai   (global install)" >&2
  echo "  brew install opencode-ai/tap/opencode" >&2
  exit 1
fi

# Check if dist/index.js exists (project needs to be built)
if [ ! -f "${SCRIPT_DIR}/dist/index.js" ]; then
  echo "Error: dist/index.js not found. Run 'npm run build' first." >&2
  exit 1
fi

# Check if opencode server is already running on this port
if curl -sf "${BASE_URL}/session" >/dev/null 2>&1; then
  # Server already running — just start the MCP
  exec node "${SCRIPT_DIR}/dist/index.js"
fi

# Start OpenCode server in the background
"$OPENCODE" serve --hostname="$HOST" --port="$PORT" &>/dev/null &
OC_PID=$!

# Wait for server to be ready (up to 10 seconds)
for i in $(seq 1 20); do
  if ! kill -0 "$OC_PID" 2>/dev/null; then
    echo "Error: opencode server exited unexpectedly" >&2
    exit 1
  fi
  if curl -sf "${BASE_URL}/session" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "Error: opencode server failed to start within 10 seconds" >&2
    exit 1
  fi
  sleep 0.5
done

# Start MCP server (stdio) — replaces this shell process
exec node "${SCRIPT_DIR}/dist/index.js"
