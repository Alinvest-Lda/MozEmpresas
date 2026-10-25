# Live schema baseline — 2026-10-25

## Files

- `20261025_live_public_schema.sql`: SQL definitions reconstructed from the live `public` catalog.
- `20261025_live_schema_inventory.json`: detailed metadata for tables and columns, constraints, indexes, RLS policies, functions, triggers, views, enums, grants, roles, extensions and applied migrations.
- `20261025_migration_history_reconciliation.json`: comparison of live migration ledger names against repository migration filenames.
- `pg_dump_live_public_schema.sql`: reserved output path for the native `pg_dump` snapshot. It is not committed yet because the source connection string is not available to this execution environment.

## Captured public schema

- 59 tables; all 59 have Row Level Security enabled.
- 251 constraints, 159 indexes in the catalog, 121 RLS policies.
- 31 public functions/procedures, 7 triggers, 1 view and 4 enum types.
- 67 applied migration records in the live migration ledger, compared with 53 migration SQL files in the repository.

The reconstructed SQL was structurally compared against the live catalog: all 59 tables and all captured column names are present, and counts for constraints, enum types, functions, policies, triggers and views match the catalog inventory. This check is not a substitute for parsing and replaying the SQL in a clean database.

## Important limitations

This is a reference baseline, **not a cutover-ready migration**. It was generated from live catalog queries, not by native `pg_dump`, because this environment does not have the source database connection string. It does not include production data, auth/storage schemas, extension internals, ownership, role passwords, or a complete provider-independent replacement for Supabase Auth/Storage. Some functions and policies reference Supabase roles and `auth.uid()`.

Do not apply this snapshot to the live source or use it as the sole migration to a standalone PostgreSQL database. Generate the native dump with `npm run db:schema:dump`, compare it with this snapshot, then test a clean-room restore and reconcile migration history before any cutover.
