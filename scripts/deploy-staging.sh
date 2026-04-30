#!/usr/bin/env bash
# deploy-staging.sh
# Deploys the Two Spies services to the staging environment.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CYAN='\033[0;36m'
NC='\033[0m'

echo "Deploying Two Spies services to STAGING..."

cd "$REPO_ROOT"

# Ensure the shared network exists (it should be created by the prod stack, but let's be safe)
if ! docker network ls | grep -q "spies-network"; then
    echo "Creating shared network 'spies-network'..."
    docker network create spies-network
fi

# Use -p staging to isolate from production containers
docker compose -p staging -f docker-compose-staging.yml up --build -d

echo -e "Staging services have been deployed."
echo -e "URL: ${CYAN}https://staging.spies.atyourservice-ai.com${NC}"
echo -e "Direct Backend:  ${CYAN}ws://$(curl -s ifconfig.me):8086${NC}"
echo -e "Direct Frontend: ${CYAN}http://$(curl -s ifconfig.me):4174${NC}"
