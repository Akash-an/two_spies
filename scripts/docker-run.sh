#!/usr/bin/env bash
# docker-run.sh
# Starts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="two_spies"
if [[ "${1:-}" == "--prod" ]]; then
    COMPOSE_FILE="docker-compose-prod.yml"
    echo "Starting Two Spies services (PRODUCTION)..."
elif [[ "${1:-}" == "--staging" ]]; then
    COMPOSE_FILE="docker-compose-staging.yml"
    PROJECT_NAME="staging"
    echo "Starting Two Spies services (STAGING)..."
else
    echo "Starting Two Spies services (Development)..."
fi

cd "$REPO_ROOT" && docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up -d

echo "Services are starting..."
if [[ "$COMPOSE_FILE" == "docker-compose-prod.yml" ]]; then
    echo -e "Host: ${CYAN}spies.atyourservice-ai.com${NC}"
elif [[ "$COMPOSE_FILE" == "docker-compose-staging.yml" ]]; then
    echo -e "Host: ${CYAN}staging.spies.atyourservice-ai.com${NC}"
    echo -e "Direct Backend:  ${CYAN}ws://localhost:8086${NC}"
    echo -e "Direct Frontend: ${CYAN}http://localhost:4174${NC}"
else
    echo -e "Frontend: ${CYAN}http://localhost:5173${NC}"
    echo -e "Backend:  ${CYAN}ws://localhost:8085${NC}"
fi
echo "Use 'docker compose -p $PROJECT_NAME -f $COMPOSE_FILE logs -f' to view output."
