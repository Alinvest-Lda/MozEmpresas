# Database schema snapshots

The audit found substantial drift between repository migrations and the live Supabase database. Do not manufacture a baseline from incomplete migrations.

When the source database connection string is available, run:

```bash
SUPABASE_SOURCE_DATABASE_URL='postgresql://…' npm run db:schema:dump
```

The script exports the live `public`, `auth`, and `storage` schemas into `database/schema-baseline.sql`. Review the output before committing it. It is a snapshot for reconciliation; it is not safe to apply blindly to a new database because Supabase-managed authentication/storage objects and roles require a deliberate replacement strategy.

Keep the application connection variable provider-neutral as `DATABASE_URL`. The source-only export variable is intentionally named `SUPABASE_SOURCE_DATABASE_URL` because this script reads the existing Supabase source; it should not be required by the application at runtime.
