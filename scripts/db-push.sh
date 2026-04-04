#!/bin/bash
# Apply all schema files to Supabase in order.
#
# Usage: bash scripts/db-push.sh
#
# Reads DATABASE_URL from .env.
# Supabase transaction pooler (port 6543) blocks DDL — this script
# automatically swaps to the session pooler (port 5432) for schema ops.

set -euo pipefail
cd "$(dirname "$0")/.."

# ── Load .env ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in DATABASE_URL." >&2
  exit 1
fi

export $(grep -v '^#' .env | grep -v '^$' | xargs)

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set in .env" >&2
  exit 1
fi

# ── Swap transaction pooler → session pooler for DDL ─────────────────────────
# Transaction pooler (6543) rejects CREATE TABLE etc.
# Session pooler (5432) supports full DDL.
DB_URL="${DATABASE_URL//:6543\//:5432/}"

echo "==> Connecting to Supabase (session pooler)..."
echo ""

# ── Run schema (fresh install only) ──────────────────────────────────────────
# schema.sql uses CREATE TABLE (not IF NOT EXISTS) for the core tables, so
# running it against an existing DB will error on the first conflict.
# For adding new tables to an existing DB, paste the relevant CREATE TABLE
# block from db/schema.sql directly into the Supabase SQL editor.

echo "--- Applying db/schema.sql ---"
psql "$DB_URL" -f "db/schema.sql" --set ON_ERROR_STOP=1
echo ""

echo "==> Done. All schema files applied."
echo ""
echo "Verify in Supabase dashboard → Table Editor that these tables exist:"
echo "  papers, users, reading_sessions, reading_events, paper_signals,"
echo "  user_access, section_signals, paper_tags"
