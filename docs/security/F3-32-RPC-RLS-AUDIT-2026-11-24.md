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

## Closure decision

This checkpoint records verified posture and narrows the remaining security work. It does **not** declare F3.32 closed and does not increase the global closure percentage. No live database permissions were modified because the reviewed public functions and policy-less tables require context-sensitive handling.
