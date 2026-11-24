# M-Pesa Open API — Sandbox integration readiness

**Checked:** 24 November 2026  
**Repository:** `Alinvest-Lda/MozEmpresas`, branch `main`

## Sandbox configuration

The implementation is deliberately locked to Vodacom Sandbox. The server refuses to load M-Pesa configuration unless both conditions are true:

- `MPESA_ENVIRONMENT=sandbox`
- `MPESA_API_BASE_URL=https://api.sandbox.vm.co.mz`

Sandbox routing values reflected in the supplied HTTP/API examples:

- C2B Single Stage: `POST`, port `18352`, path `/ipg/v1x/c2bPayment/singleStage/`.
- Query Transaction Status: `GET`, port `18353`, path `/ipg/v1x/queryTransactionStatus/`.
- Origin: `developer.mpesa.vm.co.mz`.
- Service Provider Code: `902809` (the Organization Shortcode supplied for this merchant account).
- API Key and Public Key remain server-side secrets and must never be prefixed with `NEXT_PUBLIC_`.
- `MPESA_MERCHANT_CODE` remains a legacy internal identifier; it is not substituted for Service Provider Code.
- No `MPESA_WEBHOOK_SECRET` is assumed or fabricated.

The Sandbox host/ports and request contract are based on the user's supplied Vodacom portal material and HTTP example. A successful mocked test validates our request construction, not the provider's acceptance of a live Sandbox request.

## Implemented in the repository

- `lib/payments/mpesa-client.ts`: server-only RSA Bearer token generation (32-character API Key, X.509 DER/SPKI RSA-4096 public key, PKCS#1 v1.5, Base64 ciphertext), HTTPS-only requests, JSON headers, Origin header, 15-second timeout and no request/credential logging.
- The client exposes C2B Single Stage and Query Transaction Status using the documented request fields.
- Sandbox-only environment guard prevents accidentally routing this checkout to the Production host.
- Account settings include a private M-Pesa payer number field. Numbers are stored in `public.user_payment_settings`, not in the public-readable `profiles` relation.
- `user_payment_settings` has RLS enabled, authenticated-user-only grants, and policies restricting SELECT/INSERT/UPDATE to the row whose `user_id` equals `auth.uid()`. Anonymous access is denied.
- The checkout pre-fills the saved number, permits a checkout-time change, validates the Mozambique international format (`258XXXXXXXXX`), and sends it as `input_CustomerMSISDN`.
- Checkout creates the existing idempotent pending service order, stores the payer MSISDN and unique third-party reference in `financial_payments`, and then calls the Sandbox C2B endpoint with the five documented string fields.
- Provider conversation ID, response code and description are stored for later reconciliation. A network timeout is treated as an unknown outcome; the code does not blindly retry and risk issuing a duplicate request.
- Database migrations add the payment correlation fields and private payer settings. They have been applied to the connected Supabase project and verified by read-only schema/privilege queries.
- Automated client tests cover RSA token encryption, C2B payload/headers, status query parameters, and rejection of Production environment configuration.

## Important payment-state boundary

An accepted C2B request or an initial `INS-0` response is not treated as proof that the customer completed payment. The current checkout deliberately leaves the order/payment pending. It does not activate a subscription, mark the invoice paid, or credit a wallet merely because the API request returned.

The Query Transaction Status client exists, but a complete production-safe settlement flow still requires the definitive provider transaction identifier and response mapping to the existing settlement RPCs. The supplied status response documents `output_ResponseTransactionStatus` and `output_ConversationID`; it does not establish a separate provider transaction ID field in that response.

## Callback / webhook boundary

The existing `app/api/webhooks/payments/mpesa/route.ts` is a legacy custom callback that expects HMAC headers and a custom payload. It is not the Vodacom callback format.

The supplied Vodacom asynchronous callback payload is:

- `input_OriginalConversationID`
- `input_ThirdPartyReference`
- `input_TransactionID`
- `input_ResultCode`
- `input_ResultDesc`

The acknowledgement contains:

- `output_OriginalConversationID`
- `output_ResponseDesc`
- `output_ResponseCode`
- `output_ThirdPartyConversationID`

The material supplied so far does not define Vodacom callback authentication/signature headers or a shared secret. The legacy HMAC handler therefore remains fail-closed and must not be mistaken for a verified Vodacom listener. Do not register an asynchronous Response URL or accept unauthenticated callbacks until the account's callback authenticity procedure is confirmed. If the account uses synchronous mode, the complete synchronous response contract must still be verified before settlement is automated.

## What remains before a real Sandbox payment test

1. Ensure the runtime that executes the server action has the Sandbox values for `MPESA_ENVIRONMENT`, `MPESA_API_KEY`, `MPESA_PUBLIC_KEY`, `MPESA_API_BASE_URL`, `MPESA_ORIGIN`, `MPESA_C2B_PORT`, `MPESA_STATUS_PORT`, and `MPESA_SERVICE_PROVIDER_CODE`.
2. Confirm the target test MSISDN is enabled/eligible in Vodacom Sandbox and has test balance/credentials as required by the provider.
3. Run the app from an environment with those Sandbox secrets; submit one M-Pesa checkout and record the returned Conversation ID / ThirdPartyReference.
4. Query the transaction status using the documented endpoint and reconcile the exact response with Vodacom's Sandbox behaviour.
5. Only after the final transaction identifier and verified outcome mapping are established should we connect status reconciliation to the existing settlement RPCs.

## Scope of this intervention

Changes were made on GitHub `main` and in the connected Supabase database only. No Vercel configuration, deployment, or live Production call was performed. No real or Sandbox charge has yet been executed from this session.
