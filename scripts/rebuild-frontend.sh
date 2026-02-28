#!/usr/bin/env bash
# rebuild-frontend.sh
# Stops any running Vite dev server, reinstalls deps if needed, and restarts it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
LOG_FILE="$REPO_ROOT/frontend/vite.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=== Two Spies Frontend Rebuild ===${NC}"

# ── 1. Stop existing Vite dev server ──────────────────────────────────────
echo -e "${YELLOW}[1/3] Stopping existing Vite server...${NC}"
if pgrep -f "vite" > /dev/null 2>&1; then
    pkill -f "vite" && echo -e "      ${GREEN}Vite server stopped.${NC}"
    sleep 1
else
    echo -e "      No running Vite server found."
fi

# ── 2. Install / sync dependencies ────────────────────────────────────────
echo -e "${YELLOW}[2/3] Checking dependencies...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "      node_modules missing — running npm install..."
    npm install
else
    echo -e "      node_modules present. Skipping install."
fi

# ── 3. Type-check then start dev server ───────────────────────────────────
echo -e "${YELLOW}[3/3] Type-checking & starting Vite dev server...${NC}"

# Run TypeScript check; fail fast before starting
if ! npx tsc --noEmit 2>&1; then
    echo -e "${RED}[ERROR] TypeScript errors found. Fix them before restarting.${NC}"
    exit 1
fi
echo -e "      ${GREEN}TypeScript check passed.${NC}"

npm run dev > "$LOG_FILE" 2>&1 &
VITE_PID=$!

# Wait for Vite to print its ready message
for i in {1..20}; do
    if grep -q "Local:" "$LOG_FILE" 2>/dev/null; then
        break
    fi
    sleep 0.5
done

if kill -0 "$VITE_PID" 2>/dev/null; then
    URL=$(grep -oE "http://localhost:[0-9]+" "$LOG_FILE" | head -1)
    echo -e "      ${GREEN}Vite server started (PID $VITE_PID).${NC}"
    echo -e "      Open ${CYAN}${URL:-http://localhost:5173}${NC}"
    echo -e "      Logs: ${CYAN}$LOG_FILE${NC}"
    echo "$VITE_PID" > "$FRONTEND_DIR/.vite.pid"
else
    echo -e "${RED}[ERROR] Vite server failed to start. Check $LOG_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}=== Frontend ready ===${NC}"
