# Database schema baselines

## Captured live state

On 2026-10-25, the active Supabase database was inspected through read-only PostgreSQL catalog queries. The resulting files are committed under `database/baseline/`:

- `20261025_live_public_schema.sql`: reconstructed schema-only reference snapshot from live catalog definitions.
- `20261025_live_schema_inventory.json`: machine-readable inventory of columns, constraints, indexes, policies, functions, triggers, views, enum types, RLS state, installed extensions and migration history.

The captured public schema contains **67 applied migration records**, **59 tables**, **251 constraints**, **159 indexes**, **121 RLS policies**, **31 public functions/procedures**, **7 triggers**, and **1 view**. All 59 public tables have RLS enabled. No production table data was exported.

The SQL snapshot is a *reference baseline*, not yet a canonical, independently replay-tested migration. It was reconstructed from catalog metadata because this environment does not have the source database connection string required to run `pg_dump`. It intentionally does not reproduce ownership/role grants, extension internals, sequence live values, Supabase-managed `auth` and `storage` schemas, or publication settings. Some policies and functions depend on Supabase objects such as `auth.uid()`, roles, and `auth.users`; therefore, do not apply this file directly to a standalone PostgreSQL server.

## Create the native PostgreSQL dump

When the source connection string is available, run:

```bash
SUPABASE_SOURCE_DATABASE_URL='postgresql://…' npm run db:schema:dump
```

This uses `pg_dump --schema-only --no-owner --no-privileges --schema=public` and writes `database/baseline/pg_dump_live_public_schema.sql`. Keep the native dump alongside the reconstructed inventory, compare both, and review the differences before treating the baseline as canonical.

The source-only variable `SUPABASE_SOURCE_DATABASE_URL` is intentionally distinct from the application's provider-neutral runtime variable `DATABASE_URL`. Never commit either connection string.

## Migration history reconciliation

A comparison of the live migration ledger with the current repository listing found **67 applied migration records** and **53 SQL migration files**. Only **32 applied records** have an exact filename/name match. This is a name-based heuristic, not proof that the unmatched SQL changes are absent: some may have been renamed, squashed or combined.

The full comparison is stored in `database/baseline/20261025_migration_history_reconciliation.json`. Reconcile every mismatch by comparing SQL content and the live schema before using `supabase db push` or `supabase migration repair`.

## Cutover precautions

1. Treat this snapshot as read-only evidence until native `pg_dump` and a clean-room restore have been tested.
2. Reconcile missing/renamed migration files without rewriting production history.
3. Identify Supabase-specific auth, storage, RLS, extension, and RPC dependencies.
4. Create a standalone PostgreSQL schema and migration plan that replaces those dependencies deliberately.
5. Restore into a staging database, verify object counts and application flows, and only then plan a production cutover.
