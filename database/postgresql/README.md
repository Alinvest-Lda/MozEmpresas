# Standalone PostgreSQL support

These SQL files are provider-neutral PostgreSQL, unlike the existing `supabase/migrations` directory, which includes Supabase-specific roles, auth, storage and RPC dependencies.

Apply `001_public_endpoint_support.sql` only after restoring the reconciled application schema. It creates the support tables used by the new provider-neutral server routes without requiring Supabase roles.

The complete application cannot yet run on standalone PostgreSQL: authentication, several RPC-backed domains, storage and some foreign keys still depend on Supabase. The source schema dump must be generated and reviewed before planning that cutover.
