#!/usr/bin/env bash
# rebuild-all.sh
# Rebuilds and restarts both the C++ backend server and the Vite frontend dev server.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$REPO_ROOT/scripts"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Two Spies — Full Rebuild & Restart  ${NC}"
echo -e "${CYAN}======================================${NC}"

bash "$SCRIPTS_DIR/rebuild-backend.sh" "$@"
echo ""
bash "$SCRIPTS_DIR/rebuild-frontend.sh"

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Both services are running.          ${NC}"
echo -e "${GREEN}  Backend : ws://localhost:${1:-8080}          ${NC}"
echo -e "${GREEN}  Frontend: http://localhost:5173      ${NC}"
echo -e "${GREEN}======================================${NC}"
