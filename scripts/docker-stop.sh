#!/usr/bin/env bash
# docker-stop.sh
# Stops the Two Spies services using Docker Compose.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Stopping Two Spies services..."
cd "$REPO_ROOT" && docker compose down

echo "Services stopped."
