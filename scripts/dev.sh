#!/bin/bash
# Clean up orphans and start watch mode
cd "$(dirname "$0")/.."
docker compose down --remove-orphans
docker compose watch
