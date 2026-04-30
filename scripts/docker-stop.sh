#!/usr/bin/env bash
# docker-stop.sh
# Stops the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="two_spies"
if [[ "${1:-}" == "--prod" ]]; then
    COMPOSE_FILE="docker-compose-prod.yml"
    echo "Stopping Two Spies services (PRODUCTION)..."
elif [[ "${1:-}" == "--staging" ]]; then
    COMPOSE_FILE="docker-compose-staging.yml"
    PROJECT_NAME="staging"
    echo "Stopping Two Spies services (STAGING)..."
else
    echo "Stopping Two Spies services (Development)..."
fi

cd "$REPO_ROOT" && docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" down

echo "Services stopped."
