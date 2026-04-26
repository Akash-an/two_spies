#!/usr/bin/env bash
# docker-run.sh
# Starts the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Starting Two Spies services via Docker Compose..."
cd "$REPO_ROOT" && docker compose up -d

echo "Services are starting."
echo "Frontend: http://localhost:5173"
echo "Backend: ws://localhost:8080"
echo "Use 'docker compose logs -f' to view output."
