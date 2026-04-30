#!/usr/bin/env bash
# docker-rebuild.sh
# Rebuilds and restarts the Two Spies services using Docker Compose.
#
# Usage:
#   ./scripts/docker-rebuild.sh [OPTIONS]
#
# Options:
#   --prod              Use production configuration (docker-compose-prod.yml)
#   --staging           Use staging configuration (docker-compose-staging.yml)
#   --branch <name>     Checkout to the specified git branch before rebuilding
#
# Examples:
#   ./scripts/docker-rebuild.sh --staging --branch feature/mobile
#   ./scripts/docker-rebuild.sh --prod

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="two_spies"
BRANCH=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --prod)
            COMPOSE_FILE="docker-compose-prod.yml"
            shift
            ;;
        --staging)
            COMPOSE_FILE="docker-compose-staging.yml"
            PROJECT_NAME="staging"
            shift
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [[ "$COMPOSE_FILE" == "docker-compose-prod.yml" ]]; then
    echo "Rebuilding and restarting Two Spies services (PRODUCTION)..."
elif [[ "$COMPOSE_FILE" == "docker-compose-staging.yml" ]]; then
    echo "Rebuilding and restarting Two Spies services (STAGING)..."
else
    echo "Rebuilding and restarting Two Spies services (Development)..."
fi

cd "$REPO_ROOT"

# Optional branch checkout
if [[ -n "$BRANCH" ]]; then
    echo -e "Switching to branch: ${CYAN}${BRANCH}${NC}"
    git checkout "$BRANCH"
    git pull origin "$BRANCH" || echo "Warning: Could not pull latest changes for $BRANCH"
fi

# Ensure the shared network exists for prod/staging
if [[ "$COMPOSE_FILE" != "docker-compose.yml" ]]; then
    if ! docker network inspect spies-network >/dev/null 2>&1; then
        echo "Creating shared network 'spies-network'..."
        docker network create spies-network
    fi
fi

docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" up --build -d

echo "Services have been rebuilt and restarted."
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
