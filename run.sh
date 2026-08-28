#!/bin/bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

PORT="${PORT:-3000}"
REACT_BROWSER="${REACT_BROWSER:-none}"

ELECTRON_PID=""
REACT_PID=""

kill_node_on_port() {
    local pids
    mapfile -t pids < <(lsof -ti tcp:"$PORT" || true)
    if [[ ${#pids[@]} -gt 0 ]]; then
        for pid in "${pids[@]}"; do
            if ps -p "$pid" -o comm= | grep -qi "node"; then
                echo "Killing node process on port $PORT (PID: $pid)"
                kill -9 "$pid" 2>/dev/null || true
            else
                echo "Port $PORT in use by non-node process (PID: $pid), skipping"
            fi
        done
    else
        echo "Port $PORT is free"
    fi
}

cleanup() {
    echo "Cleaning up background processes..."
    if [[ -n "$REACT_PID" ]] && ps -p "$REACT_PID" >/dev/null 2>&1; then
        kill "$REACT_PID" 2>/dev/null || true
    fi
    if [[ -n "$ELECTRON_PID" ]] && ps -p "$ELECTRON_PID" >/dev/null 2>&1; then
        kill "$ELECTRON_PID" 2>/dev/null || true
    fi
    kill_node_on_port
}

handle_interrupt() {
    echo "Received interrupt signal."
    cleanup
    exit 1
}

trap handle_interrupt INT TERM

kill_node_on_port

echo "Starting Electron (npm run electron-test)..."
npm run electron-test &
ELECTRON_PID=$!

echo "Starting React dev server without auto-opening browser..."
( BROWSER="$REACT_BROWSER" npm start ) &
REACT_PID=$!

echo "Waiting for Electron process (PID: $ELECTRON_PID) to finish..."
wait "$ELECTRON_PID"
echo "Electron exited, shutting down dev server."

cleanup
trap - INT TERM
echo "All processes stopped."