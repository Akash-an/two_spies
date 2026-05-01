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
#   --force             Force pull the branch (git fetch + reset --hard)
#
# Examples:
#   ./scripts/docker-rebuild.sh --staging --branch feature/mobile --force
#   ./scripts/docker-rebuild.sh --prod

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="two_spies"
BRANCH=""
FORCE=false

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
        --force)
            FORCE=true
            shift
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

# Git sync logic
if [[ -n "$BRANCH" ]]; then
    echo -e "Switching to branch: ${CYAN}${BRANCH}${NC}"
    git fetch origin
    if [[ "$FORCE" == "true" ]]; then
        echo -e "${CYAN}Force resetting to origin/${BRANCH}...${NC}"
        git checkout -f "$BRANCH"
        git reset --hard "origin/$BRANCH"
    else
        git checkout "$BRANCH"
        git pull origin "$BRANCH" || echo "Warning: Could not pull latest changes for $BRANCH"
    fi
elif [[ "$FORCE" == "true" ]]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "${CYAN}Force resetting current branch ${CURRENT_BRANCH} to origin...${NC}"
    git fetch origin
    git reset --hard "origin/$CURRENT_BRANCH"
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
