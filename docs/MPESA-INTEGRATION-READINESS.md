# M-Pesa Open API — integration readiness

**Checked:** 24 November 2026  
**Repository:** `Alinvest-Lda/MozEmpresas`, branch `main`

## Confirmed production configuration

The Vercel Production environment was inspected without decrypting or printing secret values:

- `MPESA_API_KEY`: present as a protected Secret.
- `MPESA_PUBLIC_KEY`: present.
- `MPESA_API_BASE_URL`: `https://api.vm.co.mz`.
- `MPESA_MERCHANT_CODE`: present; this is the application's current internal merchant identifier used by the legacy callback implementation.
- `MPESA_SERVICE_PROVIDER_CODE`: present, configured as `902809`, based on the Organization Shortcode supplied for this merchant account.
- `MPESA_ORIGIN`: configured provisionally as `developer.mpesa.vm.co.mz`.
- `MPESA_C2B_PORT`: configured provisionally as `18352`.
- `MPESA_STATUS_PORT`: configured provisionally as `18353`.
- `MPESA_WEBHOOK_SECRET`: deliberately absent. Do not create or require a Vodacom shared secret unless the authenticated account documentation explicitly defines one.

The Organization Shortcode and Service Provider Code are being treated as the same merchant identifier (`902809`) for this configuration. This mapping must be checked against the merchant's account/API application details in the Vodacom portal; it is not a reason to invent a second shortcode.

Environment-variable presence does not prove that credentials are valid, that the application is approved for production, or that the gateway accepts the configured routing values. Values were not decrypted.

## Current implementation state

- The M-Pesa service checkout creates a pending order but does not send a payment request to Vodacom.
- There is no implemented server-side authentication/session flow, C2B initiation client, or transaction-status query client.
- The current webhook route expects a custom JSON payload and HMAC headers (`x-mpesa-timestamp`, `x-mpesa-signature`) and requires `MPESA_WEBHOOK_SECRET`.
- That HMAC protocol, callback payload, and shared-secret requirement have not been established as Vodacom's protocol for this account. Since the secret is intentionally not configured, the current route fails closed with HTTP 503; do not add a made-up secret or disable authenticity checks.
- Callback data must not settle an order or wallet until it has been authenticated according to Vodacom's documented mechanism and reconciled against a server-to-server transaction-status query, unless the official account specification prescribes a different safe sequence.
- No live payment or production transaction has been attempted.

## What public Vodacom documentation establishes

Vodacom's public Mozambique page lists C2B (synchronous and asynchronous), B2C, B2B, reversals, and Query Transaction Status, and directs developers to the authenticated portal:

- Public API overview: https://www.vm.co.mz/m-pesa/artigo/api-aberta-do-m-pesa
- Developer portal: https://developer.mpesa.vm.co.mz/
- M-Pesa Business contact: https://www.vm.co.mz/m-pesa/artigo/apoio-ao-cliente (M-Pesa.Business@vm.co.mz; 84 09 00 000)

The public overview does not publish the account-specific authentication exchange, exact operation paths/ports, request and response schemas, callback authentication, callback retry rules, or production enablement state. Community references to port 18352 for C2B, port 18353 for status query, and paths such as `/ipg/v1x/c2bPayment/singleStage/` and `/ipg/v1x/queryTransactionStatus/` are clues only and must not be treated as confirmed account configuration.

## Evidence still required from the authenticated portal / Vodacom

1. Authentication procedure and exact token/session exchange, including the role of the API Key and Public Key.
2. C2B operation URL, port, required headers (including the exact Origin value), request body, response body, and error/status mapping.
3. Transaction-status query URL, port, headers, request and response examples.
4. Callback registration requirements, callback URL constraints, exact payload, authenticity mechanism, retry policy, and whether callbacks are required for the chosen C2B mode.
5. Confirmation that `902809` is the Service Provider Code attached to these production credentials and that the application is approved/live.

Once these are available, implement the server-only provider client, connect the idempotent pending order to C2B initiation, implement status reconciliation, replace the unverified callback contract with the documented one, add mocked tests, and run CI. Perform sandbox/UAT before production enablement. Never trigger a real charge without explicit authorization.

## Configuration follow-up — 24 November 2026

The Production variables above were added/updated in Vercel. A new deployment is required for changed Production variables to become available to a running deployment. The latest repository commit for this configuration is `59716efb0ddb89463a84a084f344c621f2e82817`. Its Vercel status check reported success; no GitHub Actions workflow run was returned for that SHA. A successful hosting status check does not establish that the M-Pesa protocol is implemented or that a real transaction works.
