# PostgreSQL portability and environment configuration

## Connection strategy

The application now prefers the provider-neutral `DATABASE_URL` for new server-side operations: shared rate limiting, contact submissions, ad delivery event writes, and advertising requests. It uses the standard PostgreSQL wire protocol through the `postgres` Node.js driver, with TLS required by default.

When `DATABASE_URL` is absent, these operations fall back to the current Supabase service-role client and its rate-limit RPC. Existing authentication, Supabase SSR cookies, and several RPC-backed features (including ad decisions) still depend on Supabase. Configuring `DATABASE_URL` alone does **not** complete a migration away from Supabase.

## Environment variables

- `DATABASE_URL`: preferred PostgreSQL connection string. Keep it server-only.
- `DATABASE_SSL`: TLS is required by default. Set to `disable` only for local development.
- `TRUSTED_CLIENT_IP_HEADER`: name of the header set by the trusted hosting proxy. Defaults to `x-vercel-forwarded-for`; configure it to the trusted client-IP header when hosting elsewhere. Do not trust arbitrary client-supplied forwarding headers.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: required by existing authentication and Supabase-backed features.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only compatibility fallback until remaining Supabase operations are migrated.

Never expose database URLs, passwords, or service-role credentials through `NEXT_PUBLIC_*`.

## Schema and migration notes

The current `supabase/migrations` directory contains migrations for the existing Supabase deployment. Some depend on Supabase roles, authentication functions, or RPC conventions and must not be assumed to run unchanged on standalone PostgreSQL.

Before switching providers, produce and review a schema-only export from the live database, including extensions, roles/grants, indexes, triggers, policies, functions and views. Reconcile that export with migration history. Migrate data and verify row counts and application flows in a staging PostgreSQL instance before changing production connection settings.

## Rate limiting

Rate limits are stored in PostgreSQL and shared across application instances. The request identity uses only the configured trusted proxy header; if absent, requests share a fallback identity rather than accepting an untrusted `x-forwarded-for` value. Configure the proxy header correctly for each deployment.
