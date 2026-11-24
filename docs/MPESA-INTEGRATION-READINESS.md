# M-Pesa Open API — integration readiness

**Checked:** 24 November 2026  
**Repository:** `Alinvest-Lda/MozEmpresas`, branch `main`

## Confirmed configuration in Vercel Production

The project environment was inspected with values kept encrypted/not decrypted:

- `MPESA_API_KEY`: present, visibility `secret`.
- `MPESA_PUBLIC_KEY`: present.
- `MPESA_API_BASE_URL`: present.
- `MPESA_MERCHANT_CODE`: present.
- `MPESA_SERVICE_PROVIDER_CODE`: not present as a separate variable.
- `MPESA_WEBHOOK_SECRET`: not present and must not be invented.

The production host supplied for this integration is `api.vm.co.mz`. The environment inspection did not decrypt or validate any credential, and therefore does not prove that the values are correct or accepted by Vodacom.

## Important distinction

`MPESA_MERCHANT_CODE` is an application-level name currently consumed by the custom callback route. It must not be assumed to be the Vodacom `Service Provider Code`. Confirm the exact Service Provider Code in the authenticated developer portal/contract before assigning `MPESA_SERVICE_PROVIDER_CODE`.

## Current implementation gap

- The service checkout creates a pending M-Pesa order but does not call the Vodacom gateway.
- The current callback route expects a custom JSON schema and HMAC headers (`x-mpesa-timestamp`, `x-mpesa-signature`) and requires `MPESA_WEBHOOK_SECRET`.
- That HMAC scheme and callback schema have not been established as Vodacom's protocol for this account. Do not create a fake shared secret or remove callback verification and then trust arbitrary public callbacks.
- The callback must be reconciled against a server-to-server transaction-status query before any wallet/order settlement, using the exact request/response fields from the account's portal documentation.
- No live payment or production transaction was attempted.

## What public documentation establishes

Vodacom's public Mozambique page lists C2B, B2C, B2B, reversals and transaction-status queries, and directs developers to `https://developer.mpesa.vm.co.mz/`.

Community SDK material commonly documents C2B on port `18352` and transaction-status query on `18353`, with `/ipg/v1x/c2bPayment/singleStage/` and `/ipg/v1x/queryTransactionStatus/`. These are implementation clues only; they are not a substitute for the account-specific API pages and must be checked against the portal before use.

Some community material also reports callback endpoints must use HTTPS on ports 11000–19000. This has not been confirmed from the official Mozambique account documentation. It is a deployment risk to resolve before choosing Vercel for callbacks.

## Required evidence to complete the integration safely

Obtain/export from the authenticated Vodacom developer portal:

1. C2B request headers and full request body example.
2. Authentication procedure (including whether the API key is encrypted directly into a bearer token or exchanged for a session first).
3. C2B response fields and status/error mapping.
4. Transaction-status query method, path, headers, request and response examples.
5. Callback registration rules, exact callback payload, retry behaviour and any documented authenticity mechanism.
6. Confirmed Service Provider Code and whether the production application is approved/live.

Once these are available, implement the server-only client, connect checkout to C2B initiation, reconcile status before settlement, adapt the callback to the documented payload, add mocked tests and run CI. Sandbox/UAT testing should precede any production enablement. No production charge should be triggered without explicit approval.
