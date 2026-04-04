#!/bin/bash
# Purge dangling Docker images, stopped containers, and unused networks.
# Run this after builds to reclaim disk space.
# Usage: bash scripts/purge-null-images.sh

set -e

echo "==> Stopped containers"
docker container prune -f

echo "==> Dangling images (<none>:<none>)"
docker image prune -f

echo "==> Unused networks"
docker network prune -f

echo ""
echo "Current disk usage:"
docker system df
