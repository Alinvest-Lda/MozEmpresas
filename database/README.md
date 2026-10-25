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

The live database records 67 applied migrations. 50 applied migration version(s) do not have an obvious matching timestamped SQL filename in the current repository listing; this needs a separate migration-history reconciliation before a clean database can be rebuilt from Git alone.

- Live 20260927143639: `add_user_type_to_profiles`
- Live 20260927144528: `align_account_types_with_marketplace`
- Live 20260927150637: `reconcile_marketplace_foundation`
- Live 20260927152352: `implement_business_access_architecture`
- Live 20260927152458: `secure_business_invitation_acceptance`
- Live 20260927153313: `add_commerce_purchase_foundation`
- Live 20260927153406: `create_platform_services_catalog`
- Live 20260928185610: `commerce_partner_service_audit_foundation`
- Live 20260928185738: `access_audit_insert_policy`
- Live 20260928212034: `business_portfolio_media`
- Live 20260929111315: `listing_attachments`
- Live 20261001185928: `listing_business_manager_access`
- Live 20261001185941: `cleanup_duplicate_listing_policy`
- Live 20261001200119: `service_request_platform_operations`
- Live 20261001203155: `platform_staff_moderation_access`
- Live 20261001203954: `monetization_foundation`
- Live 20261001204936: `platform_credit_wallets_and_packages`
- Live 20261001210147: `self_service_advertising_catalog`
- Live 20261001210351: `secure_advertising_rpc_execute`
- Live 20261001225429: `platform_service_self_service_checkout`
- Live 20261001225827: `financial_account_and_simulated_service_prices`
- Live 20261001225918: `secure_service_credit_checkout`
- Live 20261001225952: `credit_purchase_payment_proofs`
- Live 20261002081514: `advertising_mpesa_payment_method`
- Live 20261004144556: `businesses_manager_rls_and_archive`
- Live 20261004153340: `alignment_phase_test`
- Live 20261004153606: `align_business_context_commerce_atomicity_and_realtime`
- Live 20261004163049: `fix_business_rls_recursion_with_definer_helper`
- Live 20261004163440: `fix_business_rls_recursion_and_listing_access_live`
- Live 20261004181103: `finalize_security_rls_hardening`
- Live 20261004181125: `harden_atomic_purchase_rpc_access`
- Live 20261004182837: `add_partner_user_type_and_activate_partner_account`
- Live 20261006064838: `partner_access_grants_runtime`
- Live 20261006064849: `partner_access_functions_runtime`
- Live 20261006144010: `partner_account_and_managers`
- Live 20261006144042: `partner_account_security_and_claim`
- Live 20261006150108: `partner_profile_and_entitlements`
- Live 20261006151423: `partner_premium_advertising`
- Live 20261008140229: `add_youth_initiative_opportunity_type`
- Live 20261010094341: `add_scoped_campaign_performance_metrics`
- Live 20261010102247: `remove_contests_module`
- Live 20261012172123: `marketplace_order_notifications`
- Live 20261015082020: `restrict_global_admin_actions_to_super_admin`
- Live 20261025074714: `p0_secure_profiles_and_public_rate_limit`
- Live 20261025075005: `allow_self_deactivation_only`
- Live 20261025075049: `lock_public_profile_view`
- Live 20261025075212: `public_profiles_invoker_view`
- Live 20261025075331: `restrict_public_write_bypasses`
- Live 20261025075431: `create_contact_messages`
- Live 20261025080200: `revoke_trigger_function_execute`

## Cutover precautions

1. Treat this snapshot as read-only evidence until native `pg_dump` and a clean-room restore have been tested.
2. Reconcile missing/renamed migration files without rewriting production history.
3. Identify Supabase-specific auth, storage, RLS, extension, and RPC dependencies.
4. Create a standalone PostgreSQL schema and migration plan that replaces those dependencies deliberately.
5. Restore into a staging database, verify object counts and application flows, and only then plan a production cutover.
