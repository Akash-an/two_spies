#!/usr/bin/env bash
# rebuild-backend.sh
# Stops any running two_spies_server, recompiles the backend, and restarts it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$REPO_ROOT/backend/build"
SERVER_BIN="$BUILD_DIR/two_spies_server"
SERVER_PORT="${1:-8085}"
SERVER_MAX_PLAYERS="${2:-4}"
LOG_FILE="$REPO_ROOT/backend/server.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Two Spies Backend Rebuild ===${NC}"

# ── 1. Stop existing server ────────────────────────────────────────────────
echo -e "${YELLOW}[1/3] Stopping existing native server...${NC}"
if pgrep -f "two_spies_server" > /dev/null 2>&1; then
    pkill -f "two_spies_server" && echo -e "      ${GREEN}Native server stopped.${NC}"
    sleep 1
else
    echo -e "      No running native server found."
fi

# Check if port is still in use (e.g. by Docker)
if lsof -i :"$SERVER_PORT" -sTCP:LISTEN > /dev/null 2>&1; then
    echo -e "${RED}[WARNING] Port $SERVER_PORT is already in use by another process.${NC}"
    echo -e "          This might be a Docker container. Try running:${NC}"
    echo -e "          ${CYAN}docker compose down${NC}"
    echo -e "          or stopping the process manually."
fi

# ── 2. Compile ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2/3] Compiling...${NC}"
if [ ! -f "$BUILD_DIR/CMakeCache.txt" ]; then
    echo -e "      Build directory not configured. Running cmake first..."
    mkdir -p "$BUILD_DIR"
    cmake -S "$REPO_ROOT/backend" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release
fi

cmake --build "$BUILD_DIR" --parallel "$(sysctl -n hw.logicalcpu 2>/dev/null || nproc 2>/dev/null || echo 4)"

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR] Compilation failed. Server not restarted.${NC}"
    exit 1
fi
echo -e "      ${GREEN}Compilation successful.${NC}"

# ── 3. Restart server ──────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3] Starting server on port $SERVER_PORT...${NC}"
"$SERVER_BIN" "$SERVER_PORT" "$SERVER_MAX_PLAYERS" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

sleep 0.5
if kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "      ${GREEN}Server started (PID $SERVER_PID).${NC}"
    echo -e "      Listening on ${CYAN}ws://localhost:$SERVER_PORT${NC}"
    echo -e "      Logs: ${CYAN}$LOG_FILE${NC}"
    echo "$SERVER_PID" > "$BUILD_DIR/server.pid"
else
    echo -e "${RED}[ERROR] Server failed to start. Check $LOG_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}=== Backend ready ===${NC}"
