#!/usr/bin/env bash
# docker-run.sh
# Starts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

echo "Starting Two Spies services via Docker Compose..."
cd "$REPO_ROOT" && docker compose up -d

echo "Services are starting (Development mode)..."
echo -e "Frontend: ${CYAN}http://localhost:5173${NC}"
echo -e "Backend:  ${CYAN}ws://localhost:8085${NC}"
echo "Use 'docker compose logs -f' to view output."
