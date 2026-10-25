#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_SOURCE_DATABASE_URL:?Set SUPABASE_SOURCE_DATABASE_URL to the live source PostgreSQL connection string}"

mkdir -p database
output="${1:-database/schema-baseline.sql}"

# Capture the actual live schema instead of reconstructing it from incomplete migrations.
# This is a source snapshot for review, not a migration to run blindly on a new provider.
npx --yes supabase db dump \
  --db-url "$SUPABASE_SOURCE_DATABASE_URL" \
  --schema public,auth,storage \
  --file "$output"

printf 'Schema snapshot written to %s\n' "$output"
