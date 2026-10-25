# Migration content review — 2026-10-25

## Purpose and scope

This is a first-pass **content-based review** of high-risk legacy and renamed migration files, following the name-only comparison in `20261025_migration_history_reconciliation.json`. It does not establish a complete one-to-one mapping between repository files and live migration-ledger entries. No migration was executed and no production data or schema was changed.

## Evidence from the live schema inventory

The captured live `public` schema has 59 tables, including `commerce_orders`, `commerce_order_items`, `commerce_transactions`, `opportunities`, and `opportunity_applications`. It does **not** contain the legacy table names `carts`, `cart_items`, `orders`, `order_items`, `payments`, `payment_events`, `contests`, or `contest_applications`. The live migration ledger also includes `20261010102247_remove_contests_module`.

This is evidence that some repository SQL describes an earlier or superseded model. It is not evidence that the corresponding migration was never applied: a later migration may have removed or replaced its objects.

## File-by-file findings

| Repository migration | Content observed | Reconciliation finding |
|---|---|---|
| `0001_mozempresas_core.sql` | Bootstrap schema for profiles, businesses, listings and early enums. | Historical bootstrap, not a safe replay file against the current database. It contains older definitions that have since evolved. |
| `0002_commerce_contests_repository_monetization.sql` | Creates legacy carts/orders/payments and contest-related objects. | Historical/superseded model: its legacy commerce and contest table names are absent from the captured live schema. Do not replay as a current-state migration. |
| `0007_public_access_hardening.sql` | Policies for contests and a member-readable listings model. | Historical policy set. It references the contests module and policy names/semantics that must not be assumed to represent current access control. Compare with live policies before any reuse. |
| `20260930010000_p0_contests_opportunities.sql` | Adds contest requirements, applications, evaluators and evaluations. | Superseded in the current state to the extent it creates contest objects; the live ledger records a later `remove_contests_module` migration and the live schema has no contest tables. |
| `20260930003000_marketplace_offline_commerce.sql` | Replaces commerce order status values and documents the offline marketplace model. | Relevant historical business rule, but the live commerce schema has continued to evolve. Preserve the rule as a product decision, not as proof this file is the exact applied migration. |
| `20260929233000_commerce_seller_order_actions.sql` | Adds a seller update policy for `commerce_orders`. | Policy intent is relevant, but the current policy set is the authority. Reconcile policy definitions and authorization semantics rather than replaying this file. |
| `20261001000000_self_service_advertising.sql` | Adds `ad_products`, promotion pricing fields and a credit-purchase function. | Strong semantic overlap with live advertising/credit objects, but the live ledger contains several differently named advertising and checkout entries. Treat as a possible combined/renamed source only after statement-level comparison. |
| `20261004182900_fix_business_rls_recursion_and_listing_access.sql` | Creates `private.user_managed_business_ids()` and rewrites business/member/listing policies. | The helper exists in the live `private` schema and its live function body matches the file's selection logic. Live ACL grants execution to `authenticated` and `postgres`. This is a confirmed semantic match for the helper, but the full policy set still needs statement-level comparison. |
| `20261004210000_partner_dedicated_access.sql` | Creates private partner access grants and partner access RPCs. | Live inventory includes the three public RPC names, but this does not prove the whole file is an exact match. Compare function bodies, private table definition and grants. |
| `20261006180000_harden_account_boundaries.sql` | Constrains profile user types and defines `is_partner_account()`. | Live inventory includes `is_partner_account()`; this is a likely semantic match, but body/grant equality remains unverified. |
| `20261008170000_standardize_advertising_inventory.sql` | Standardizes advertising slots/creative fields and adds advertising request fields. | Live schema has the corresponding advertising tables and likely overlapping fields. Verify column defaults, constraints, policies and indexes before classifying as equivalent. |
| `20261008180500_expand_opportunity_taxonomy.sql` | Adds three values to `opportunity_type`. | The live enum inventory must be compared value-by-value; matching the enum name alone is insufficient. |
| `20261008190000_advertising_audience_engine.sql` | Adds campaign targeting fields and audience/delivery tables. | Live inventory includes audience/delivery objects. This is a strong candidate for content overlap with live advertising changes, but not a verified mapping to any specific migration-ledger row. |

## Additional live-catalog verification

A read-only follow-up query on 2026-10-25 confirmed the following content-level overlaps:

- `private.user_managed_business_ids()` exists in the live database. Its SQL body matches the function in `20261004182900_fix_business_rls_recursion_and_listing_access.sql` semantically; live execution ACL is limited to `authenticated` and `postgres` in the inspected ACL output.
- `private.partner_access_grants` exists live with the expected grant/token/status/timestamp columns, the status check and unique token hash constraint, plus the email and status indexes described by `20261004210000_partner_dedicated_access.sql`. This is strong object-level evidence of overlap, though all RPC bodies/grants and historical sequencing still require comparison.
- The live `opportunity_type` enum contains `ENTREPRENEUR_SUPPORT`, `INNOVATION_TECH`, and `EXPORT_INTERNATIONAL`, the three values added by `20261008180500_expand_opportunity_taxonomy.sql`. This confirms those changes are represented in the current state, not which ledger row introduced them.

These checks improve confidence in individual objects but do not yet map every unmatched live ledger entry to a single repository file.

## What this review establishes

1. The repository migration directory is not a clean replay sequence for an empty database in its current form: it contains historical bootstrap and module files alongside later migrations.
2. Several files overlap semantically with live objects while their names/timestamps do not match the live ledger. A migration may have been renamed, combined, manually applied, or superseded; the evidence currently does not distinguish these cases.
3. Current live schema objects, policy definitions, function bodies, constraints, grants, and the ledger must be compared together. File-name similarity alone is not enough.
4. No production migration history should be repaired or replayed based on this report.

## Next reconciliation pass

- Compare each unmatched live ledger entry to repository SQL by object fingerprints: table/column changes, constraints, enum values, policy names and expressions, function signatures/bodies, triggers, and grants.
- Record each candidate as `confirmed-equivalent`, `partially-represented`, `superseded`, `live-only`, `repo-only`, or `unresolved`, with the exact evidence and confidence.
- Investigate private-schema objects and Supabase-managed dependencies separately; the current public-schema inventory alone cannot establish their complete state.
- Obtain a native schema-only `pg_dump` and validate restore into an isolated staging PostgreSQL/Supabase-compatible environment before calling the baseline canonical.
