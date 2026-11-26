# B8-T09 — Configuration/security control inventory

Updated 26/11/2026. No secrets or actual environment values are copied here.

| Surface | Source of truth | Current control | Open implementation/validation note |
|---|---|---|---|
| Authentication/RBAC | Supabase auth + profiles/memberships; server helpers | server-side role checks, RPC guards, fail-closed admin routes | finish route/action matrix and validate RLS/grants |
| M-Pesa sandbox | environment-backed client config | sandbox gating, required service-provider code; no ambiguous retries; settlement reconciliation | confirm env inventory with deployment owner; do not reveal values |
| Resend reports | RESEND_API_KEY, RESEND_FROM_EMAIL | send disabled without configured key/sender; send marked only on provider ID | delivery-failure/retry audit |
| Partner access | private partner grant table + claim RPC | hashed tokens, identity binding, active account and single active membership guards | review private-schema grants defensively |
| Rate limit | lib/security/rate-limit.ts | trusted proxy IP resolution; fail closed if unavailable; financial audit endpoint read/write caps | inventory all routes/actions and limits |
| Uploads | private partner-documents and opportunity attachment storage | size/type checks, private/signed access, versioning for partner docs | durable cleanup/recovery queue; review all storage policies |
| Admin security headers | next.config.ts | HSTS, nosniff, frame denial, referrer and permissions policy, opener isolation | CSP withheld until third-party/script inventory complete |
| Feature/catalog | database active flags and catalogue rows | active catalogue checks at request boundaries | ensure settings mutation is reasoned/audited where privileged |
| Runtime errors | route/page query error states | critical admin surfaces increasingly distinguish errors from empty states | complete route-by-route audit; no telemetry vendor assumed |
| Secrets | deployment environment | server-only use; no rendering of values | no read-only access to Vercel secret values; document variable names only |

## Removal/unsafe controls
- No speculative migration ledger cleanup.
- Compatibility redirect is retained.
- Historical multi-manager records remain data only; no active UI path.
- No unverified webhook route or production payment mode is reintroduced.
- RLS must not be enabled or changed without explicit policy design and permission inventory.
