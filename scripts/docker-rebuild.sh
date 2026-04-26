#!/usr/bin/env bash
# docker-rebuild.sh
# Rebuilds and restarts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
if [[ "${1:-}" == "--prod" ]]; then
    COMPOSE_FILE="docker-compose-prod.yml"
    echo "Rebuilding and restarting Two Spies services (PRODUCTION)..."
else
    echo "Rebuilding and restarting Two Spies services (Development)..."
fi

cd "$REPO_ROOT" && docker compose -f "$COMPOSE_FILE" up --build -d

echo "Services have been rebuilt and restarted."
if [[ "$COMPOSE_FILE" == "docker-compose-prod.yml" ]]; then
    echo -e "Host: ${CYAN}spies.atyourservice-ai.com${NC}"
else
    echo -e "Frontend: ${CYAN}http://localhost:5173${NC}"
    echo -e "Backend:  ${CYAN}ws://localhost:8085${NC}"
fi
