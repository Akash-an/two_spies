#!/usr/bin/env bash
# docker-rebuild.sh
# Rebuilds and restarts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Rebuilding and restarting Two Spies services..."
cd "$REPO_ROOT" && docker compose up --build -d

echo "Services have been rebuilt and restarted."
echo "Frontend: http://localhost:5173"
echo "Backend: ws://localhost:8080"
