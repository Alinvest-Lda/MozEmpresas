# F3.32 — RPC and RLS security audit checkpoint

**Audit date:** 2026-11-24  
**Environment:** Supabase project `zikjvjzbbfzrelbkaaci`  
**Scope:** PostgreSQL SECURITY DEFINER functions, effective API-role execution, and public-schema RLS posture.  
**Method:** Read-only catalog queries against the live project; no grants, policies, functions, or data were changed during this audit.

## Verified inventory

- 95 functions in `public` / audited catalog scope are marked `SECURITY DEFINER` (this includes trigger/internal functions; the raw count is not a vulnerability count).
- 59 SECURITY DEFINER functions are executable by `authenticated`.
- 4 SECURITY DEFINER functions are executable by `anon`:
  - `get_ad_decision(text, uuid, text, text, jsonb)`
  - `home_ad_slots()`
  - `partner_access_validate(text)`
  - `record_ad_interest(text, uuid, text[], jsonb)`
- The 33 authenticated-executable functions with the `admin_*` prefix all contain explicit admin/staff guard references and `auth.uid()` checks in their definitions. This is a static source check; it does not replace role-based integration tests.
- Seven partner read/context RPCs inspected scope their data through `current_partner_account_id()`: `partner_account_members_list`, `partner_account_profile`, `partner_ad_campaign_metrics`, `partner_ad_campaigns_list`, `partner_ad_products_list`, `partner_entitlements_list`, and related partner context helpers.
- Eleven public tables have RLS enabled but no policies. Catalog checks show no SELECT or INSERT grants for `anon` or `authenticated` on those tables. This is a deliberate deny-by-default posture, not a missing-policy defect by itself. Includes audit/event tables, `partner_account_members`, `public_rate_limits`, and `mpesa_sandbox_test_runs`.

## Public RPC review

- `get_ad_decision` and `record_ad_interest` are public-facing advertising functions. Both validate the visitor key length and derive the user identity from `auth.uid()`, rather than trusting the optional caller-supplied user ID.
- `home_ad_slots` returns only active, time-valid homepage campaign creatives and is intended for public rendering.
- `partner_access_validate` accepts a 64-character lowercase SHA-256 token hash and returns the pending invitation email/expiry. It is currently executable by `anon`. This may be required by the invitation-acceptance flow, but the caller path, token entropy, rate limiting, and exposure of invitation metadata still require end-to-end verification. Do not revoke its public EXECUTE grant until the invite flow has been traced and a safe replacement is in place.

## Remaining work before closing F3.32

1. Trace the full partner invitation flow from token generation/email link through hash computation, validation, claim, expiry, and single-use enforcement.
2. Test the admin RPC guard matrix with a normal authenticated account, an active platform operator, and a super admin; include direct RPC calls, not only UI visibility.
3. Test partner RPC isolation using two distinct partner accounts and verify no cross-account rows or metrics are returned.
4. Review Supabase Security Advisor findings and enable leaked-password protection after confirming the Auth policy rollout.
5. Run the complete application build and integrated workflows when Vercel's deployment quota is available.

## Follow-up F3.33 — single active user per partner organization

A live Supabase migration was applied after the initial read-only audit:

- Added the partial unique index `partner_account_members_one_active_user_per_account_uidx` on `account_id WHERE active = true`.
- Hardened account-bound invitation creation: only an active Super Admin can create it; the account must be active and portal-enabled; an existing active member or unexpired pending invitation blocks another invite for that account; token hash and expiry are validated.
- Hardened invitation claim: it locks the grant and account, verifies the authenticated user ID and matching email, rejects a second active user for the same organization, and marks the grant accepted only after membership succeeds.
- Historical inactive memberships remain available.
- Verified the index exists, there are zero active account conflicts, and the invitation create/claim RPCs are not executable by `anon`.

The migration is recorded as `20261124214209_f375_enforce_single_active_partner_user_per_organization`.

## Closure decision

F3.32/F3.33 remain **in progress**. The database now enforces one active login per partner organization, but the invitation flow still needs an authenticated end-to-end test, including expiry, replay, email mismatch, and competing invite attempts. The role matrix and two-tenant isolation tests also remain outstanding. No global closure percentage is increased by this single intervention.
