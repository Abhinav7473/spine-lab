#!/bin/bash
# Seed the paper database by triggering ArXiv fetches via the admin API.
#
# Usage: bash scripts/seed.sh [HOST]
#   HOST defaults to http://localhost:8000
#
# Reads DEV_ACCESS_CODE from .env.
# The backend must be running before you call this.

set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${1:-http://localhost:8000}"

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in DEV_ACCESS_CODE." >&2
  exit 1
fi

export $(grep -v '^#' .env | grep -v '^$' | xargs)

if [ -z "${DEV_ACCESS_CODE:-}" ]; then
  echo "ERROR: DEV_ACCESS_CODE not set in .env" >&2
  exit 1
fi

# ── Topics to seed ────────────────────────────────────────────────────────────
TOPICS=(
  "transformer"
  "diffusion models"
  "reinforcement learning"
  "large language models"
  "vision transformer"
)

echo "==> Seeding papers from ArXiv via $HOST"
echo "    Topics: ${#TOPICS[@]}"
echo ""

for TOPIC in "${TOPICS[@]}"; do
  echo "--- Fetching: $TOPIC ---"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HOST/api/admin/fetch" \
    -H "Content-Type: application/json" \
    -H "X-Access-Code: $DEV_ACCESS_CODE" \
    -d "{\"topic\": \"$TOPIC\", \"max_results\": 25}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" -eq 200 ]; then
    echo "    $BODY"
  else
    echo "    ERROR ($HTTP_CODE): $BODY" >&2
  fi
  echo ""
done

echo "==> Done. Check the feed at $HOST or in the Supabase dashboard → papers table."
