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

- Added `lib/payments/mpesa-client.ts`, a server-only client for RSA Bearer authorization, C2B Single Stage initiation, and Query Transaction Status.
- The authorization implementation follows the supplied Java SDK/portal material: 32-character API Key, X.509 DER/SPKI RSA public key, PKCS#1 v1.5 encryption, and Base64 ciphertext in the Bearer header. The public key is checked to be RSA-4096.
- The client uses HTTPS, explicit operation ports, the configured Origin header, JSON content type, a 15-second timeout, no-store requests, and does not log credentials or request bodies.
- C2B request fields are mapped to the five documented `input_*` names and serialized as a JSON object, matching the user-supplied Single Stage HTTP example: `POST /ipg/v1x/c2bPayment/singleStage/`, `Content-Type: application/json`, `Authorization: Bearer <RSA-encrypted API Key>`, and `Origin: developer.mpesa.vm.co.mz`. The request body contains `input_TransactionReference`, `input_CustomerMSISDN`, `input_Amount`, `input_ThirdPartyReference`, and `input_ServiceProviderCode`, all strings. The matching request shape is now covered by the client test; a sandbox transaction is still required to verify provider acceptance.
- Query Transaction Status uses the documented three query parameters and the `GET` method.
- Added `lib/payments/mpesa-client.test.ts` with mocked HTTP tests and a generated RSA key pair. The tests have been committed but have not yet been executed by a confirmed CI run.
- The M-Pesa service checkout still creates a pending order only; it is intentionally not wired to initiate a live charge until the C2B Request Package and production routing are verified.
- The current webhook route still expects a custom JSON payload and HMAC headers (`x-mpesa-timestamp`, `x-mpesa-signature`) and requires `MPESA_WEBHOOK_SECRET`.
- The supplied Vodacom callback specification defines a different asynchronous payload (`input_OriginalConversationID`, `input_ThirdPartyReference`, `input_TransactionID`, `input_ResultCode`, `input_ResultDesc`) and the four-field acknowledgement response. It does not define callback authentication/signature headers or a Vodacom shared secret.
- The existing HMAC route must therefore remain fail-closed until a secure callback authenticity mechanism is agreed with Vodacom. Do not add a made-up Vodacom secret or disable authenticity checks.
- Callback data must not settle an order or wallet until it has been authenticated and reconciled against a server-to-server transaction-status query, unless the official account specification prescribes a different safe sequence.
- No live payment, sandbox payment, or production transaction has been attempted.

## Callback / webhook decision

- A Vodacom asynchronous result listener is required when the merchant account/API is configured for asynchronous C2B responses: the portal specification says the platform posts the final result to the Response URL configured under My Account, and the third party must acknowledge it with `output_OriginalConversationID`, `output_ResponseDesc`, `output_ResponseCode`, and `output_ThirdPartyConversationID`.
- A webhook is not required only if the merchant account is configured for synchronous responses and the synchronous C2B response contract is implemented and verified to provide a definitive transaction outcome. The currently supplied material names a synchronous mode but does not include its complete response schema or prove the account is configured for it.
- Therefore do not delete the callback route or unregister the Response URL on the basis of the current evidence. The legacy route expects an unverified custom HMAC protocol and correctly fails closed because `MPESA_WEBHOOK_SECRET` is absent; it must not be treated as the Vodacom callback implementation.
- No Vodacom-provided webhook secret has been established. The absence of such a secret does not mean the asynchronous callback can safely be accepted without authentication. Obtain the supported callback authentication/verification procedure from Vodacom, or use verified synchronous mode.
- The existing `MPESA_WEBHOOK_SECRET` variable is not configured and must not be invented. Do not remove the route until synchronous mode and its definitive response handling have been verified.

## What public Vodacom documentation establishes

Vodacom's public Mozambique page lists C2B (synchronous and asynchronous), B2C, B2B, reversals, and Query Transaction Status, and directs developers to the authenticated portal:

- Public API overview: https://www.vm.co.mz/m-pesa/artigo/api-aberta-do-m-pesa
- Developer portal: https://developer.mpesa.vm.co.mz/
- M-Pesa Business contact: https://www.vm.co.mz/m-pesa/artigo/apoio-ao-cliente (M-Pesa.Business@vm.co.mz; 84 09 00 000)

The public overview does not publish the account-specific authentication exchange, exact operation paths/ports, request and response schemas, callback authentication, callback retry rules, or production enablement state. Community references to port 18352 for C2B, port 18353 for status query, and paths such as `/ipg/v1x/c2bPayment/singleStage/` and `/ipg/v1x/queryTransactionStatus/` are clues only and must not be treated as confirmed account configuration.

## Evidence still required from the authenticated portal / Vodacom

1. Sandbox/UAT execution of the supplied C2B Single Stage request example to verify that Vodacom accepts the documented JSON body and headers.
2. Production Resource URLs and ports for C2B and Query Transaction Status; the supplied operation references currently show Sandbox host `api.sandbox.vm.co.mz`, C2B port `18352`, and status port `18353`.
3. Callback authenticity mechanism, retry policy, and any account-specific callback requirements. The payload and acknowledgement format are now documented, but authenticity is not.
4. Confirmation that `902809` is the Service Provider Code attached to these production credentials and that the application is approved/live.
5. Sandbox/UAT credentials or an approved test procedure, plus confirmation whether the merchant account is configured for asynchronous responses.

Next implementation steps are to execute the documented C2B request in Sandbox/UAT, run the committed mocked tests in CI, obtain Vodacom's callback authenticity procedure or verify the complete synchronous response mode, and connect checkout only after the order's customer MSISDN and reference mapping are verified. Perform sandbox/UAT before production enablement. Never trigger a real charge without explicit authorization.

## Configuration follow-up — 24 November 2026

The Production variables above were added/updated in Vercel. A new deployment is required for changed Production variables to become available to a running deployment. The latest repository commit for this configuration is `59716efb0ddb89463a84a084f344c621f2e82817`. Its Vercel status check reported success; no GitHub Actions workflow run was returned for that SHA. A successful hosting status check does not establish that the M-Pesa protocol is implemented or that a real transaction works.
