# M-Pesa Sandbox test Edge Function

**Project:** MozEmpresas (`zikjvjzbbfzrelbkaaci`)  
**Function:** `mpesa-sandbox-test`  
**URL:** `https://zikjvjzbbfzrelbkaaci.supabase.co/functions/v1/mpesa-sandbox-test`  
**JWT verification:** enabled  
**Scope:** one fixed Sandbox C2B test only.

## Fixed test

- Customer MSISDN: `258842553641`
- Amount: `500` MZN
- Service Provider Code: `902809`
- C2B Single Stage: `https://api.sandbox.vm.co.mz:18352/ipg/v1x/c2bPayment/singleStage/`
- Query status: `https://api.sandbox.vm.co.mz:18353/ipg/v1x/queryTransactionStatus/`

The endpoint does not accept a caller-supplied MSISDN, amount, shortcode, URL, or payment body. It requires a valid Supabase user JWT and an active `platform_members` row with role `super_admin`. A unique database test key is reserved before sending the provider request, so repeated POSTs cannot issue a second payment request. An ambiguous timeout is recorded as UNKNOWN and must be reconciled with GET; do not retry POST.

## Required Edge Function secrets

Set these under Supabase Dashboard → Project Settings → Edge Functions → Secrets (or Edge Functions → Secrets):

| Name | Value |
|---|---|
| `MPESA_SANDBOX_TEST_ENABLED` | `true` (set only when ready to run the one-time test) |
| `MPESA_ENVIRONMENT` | `sandbox` |
| `MPESA_API_KEY` | Sandbox API Key |
| `MPESA_PUBLIC_KEY` | Sandbox RSA public key, Base64 X.509 DER/SPKI |
| `MPESA_API_BASE_URL` | `https://api.sandbox.vm.co.mz` |
| `MPESA_ORIGIN` | `developer.mpesa.vm.co.mz` |
| `MPESA_C2B_PORT` | `18352` |
| `MPESA_STATUS_PORT` | `18353` |
| `MPESA_SERVICE_PROVIDER_CODE` | `902809` |

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not create duplicate values or expose them to the browser. Never commit M-Pesa keys to Git.

## Invocation

Use the signed-in super-admin session's access token. Do not put tokens in URLs or logs.

Start the single C2B request:

```http
POST /functions/v1/mpesa-sandbox-test
Authorization: Bearer <SUPABASE_USER_ACCESS_TOKEN>
apikey: <SUPABASE_ANON_KEY>
```

After the request is accepted, query its status:

```http
GET /functions/v1/mpesa-sandbox-test
Authorization: Bearer <SUPABASE_USER_ACCESS_TOKEN>
apikey: <SUPABASE_ANON_KEY>
```

A second POST returns HTTP 409 after a test attempt has been reserved. If the provider result is ambiguous, GET status first. The function does not settle an invoice, activate a service, or mark a payment as paid.

## Deployment state

The Edge Function is deployed and active with JWT verification. The database ledger table `public.mpesa_sandbox_test_runs` is created with RLS enabled and privileges limited to `service_role`. The provider test remains disabled until the required secrets above are saved and the enable flag is set. No M-Pesa request is sent by deployment.
