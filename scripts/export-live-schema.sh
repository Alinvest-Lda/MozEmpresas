#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_SOURCE_DATABASE_URL:?Set SUPABASE_SOURCE_DATABASE_URL to the source PostgreSQL connection string}"

output="${1:-database/baseline/pg_dump_live_public_schema.sql}"
mkdir -p "$(dirname "$output")"

# Native PostgreSQL schema-only export. Does not include production table data,
# ownership, or grants. It is a canonical source dump for review, not a cutover
# migration: auth/storage schemas and provider-specific objects require separate planning.
pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="$output" \
  "$SUPABASE_SOURCE_DATABASE_URL"

printf 'Native schema snapshot written to %s\n' "$output"
