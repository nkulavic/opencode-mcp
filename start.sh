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

# Check if opencode binary exists
if ! command -v opencode &>/dev/null; then
  echo "Error: opencode not found in PATH. Install with: brew install opencode-ai/tap/opencode" >&2
  exit 1
fi

# Check if opencode server is already running on this port
if curl -sf "${BASE_URL}/session" >/dev/null 2>&1; then
  # Server already running — just start the MCP
  exec node "${SCRIPT_DIR}/dist/index.js"
fi

# Start OpenCode server in the background
opencode serve --hostname="$HOST" --port="$PORT" &>/dev/null &
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
