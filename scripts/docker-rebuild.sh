#!/usr/bin/env bash
# docker-rebuild.sh
# Rebuilds and restarts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

echo "Rebuilding and restarting Two Spies services..."
cd "$REPO_ROOT" && docker compose up --build -d

echo "Services have been rebuilt and restarted."
echo -e "Frontend: ${CYAN}http://localhost:5173${NC}"
echo -e "Backend:  ${CYAN}ws://localhost:8085${NC}"
