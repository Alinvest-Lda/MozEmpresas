# B6 — Advertising closure programme (started 26/11/2026)

## Product contract
Advertising is a paid visibility product in the MozEmpresas marketplace. Business campaigns and Partner campaigns remain separate flows; administrative advertising requests are a distinct intake. No activation is to be inferred from payment initiation: settlement, status transition, capacity and lifecycle are authoritative. Refund/cancellation and externally executed M-Pesa refunds remain separate and must be evidenced. Delivery metrics must remain sourced, and unavailable data must not be represented as zero.

## Existing implementation reviewed (static source review only)
- Business flow: `app/dashboard/publicidade`, `components/advertising-purchase-form.tsx`, `lib/advertising/actions.ts`, RPC paths for credit purchase and M-Pesa request. Server actions validate identifiers, campaign start, targets and business membership, then call database RPCs.
- Partner flow: `app/parceiro/publicidade`, `app/parceiro/publicidade/pedido`, partner campaign/payment RPCs and admin partner campaign transitions. Partner products expose price, duration, capacity and credit eligibility.
- Admin control surface: `app/dashboard/admin/publicidade`, `lib/admin/advertising-actions.ts`, business/partner campaign status events, administrative events, payment/refund/cancel actions and credit-price controls.
- Public delivery: `app/api/ads/decision`, `app/api/ads/event`, `app/publicidade`, `components/public-ad.tsx`, directory ad slider and advertising hero. Event validation exists in `lib/advertising/event-validation.ts`.
- Current admin advertising page uses bounded samples (up to 100 records per source) and hides the pending summary when any of its supporting queries fail. Lists may still be partial when some sources fail; the UI warning describes this.
- This is a code inventory, not an audit, test or production proof. No migrations, test suites, E2E, RLS checks, telemetry review or deployments were run.

## B6 task breakdown — 10 elements per task, implementation batches
### B6-T01 — Catalogue and inventory integrity
1. business-ad product catalogue; 2. partner product catalogue; 3. pricing source; 4. credit price configuration; 5. fixed-price guard; 6. active/inactive visibility; 7. capacity source; 8. slot/surface mapping; 9. date/duration definitions; 10. catalogue-query failure states.

### B6-T02 — Business advertiser flow
1. advertiser/business eligibility; 2. business selection; 3. product/slot selection; 4. listing association; 5. campaign target; 6. campaign date; 7. credit checkout; 8. M-Pesa request; 9. duplicate/ambiguous submission; 10. order/campaign outcome and recovery.

### B6-T03 — Partner advertiser flow
1. partner account identity; 2. eligible formats; 3. request details; 4. campaign target; 5. dates/capacity; 6. review and reason; 7. payment order; 8. settled activation; 9. credit/M-Pesa distinction; 10. rejection/cancel/expiry recovery.

### B6-T04 — Admin campaign operations
1. bounded lists and source errors; 2. request triage; 3. business campaign transitions; 4. partner campaign transitions; 5. payment issue; 6. payment settlement evidence; 7. capacity/overlap; 8. cancel/refund; 9. reasoned immutable history; 10. revalidation after mutation.

### B6-T05 — Delivery and telemetry
1. ad decision route; 2. eligible placements; 3. view/impression event; 4. click event; 5. deduplication; 6. attribution; 7. metric-query integrity; 8. sourced totals; 9. CTR denominator safeguards; 10. failure/partial-data messaging.

### B6-T06 — Placement/slot consistency
1. public placement keys; 2. product slot identifiers; 3. hero/banner/directory surfaces; 4. responsive sizing; 5. empty slot behavior; 6. targeting compatibility; 7. duplicate rendering prevention; 8. priority/order; 9. fallback ads; 10. legacy placement mapping.

### B6-T07 — Billing and settlement reconciliation
1. campaign/payment association; 2. payment state; 3. paid evidence; 4. credit debit; 5. M-Pesa callback; 6. idempotency; 7. ambiguous gateway outcome; 8. refund/reversal; 9. ledger reconciliation; 10. notifications.

### B6-T08 — Lifecycle and scheduling
1. draft/request; 2. review; 3. payment pending; 4. paid; 5. activation; 6. pause; 7. end/expiry; 8. cancellation; 9. renewal; 10. race/stale-transition handling.

### B6-T09 — Public surfaces and advertiser UX
1. advertiser status list; 2. editability and recovery; 3. payment state clarity; 4. request errors; 5. campaign previews; 6. responsive layout; 7. accessibility labels; 8. local terminology; 9. deduped navigation; 10. remove obsolete flows only after dependency trace.

### B6-T10 — Consolidation and implementation closure
1. duplicate catalogues; 2. duplicate pricing logic; 3. state labels; 4. query helpers; 5. event/audit owners; 6. notifications; 7. routes/actions; 8. env/config; 9. source documentation; 10. implementation-readiness evidence and open gates.

## Execution note
B6 is now initiated with the above grounded inventory and 10-task closure structure. Start with T01 and proceed in bulk tasks; reuse B8/B7 advertising-related changes already present. Keep B7 open until its remaining tasks are implemented. No tests or validation without explicit permission.


## Executed implementation batches — 26/11/2026
- B6-T02: advertiser workspace now distinguishes failed catalogue, category, business, wallet, promotion and metric queries. It suppresses the purchase form when required inputs are incomplete, does not convert failed metric queries into zero impressions/clicks/investment, and shows an explicit partial-data warning. Commit `14a7df5`.
- B6-T04: administrative campaign delivery totals/CTR are suppressed when either campaign source query fails, rather than summing an incomplete source as if complete. Existing warning and pending-count suppression remain. Commit `695c47f`.
- B6-T05: ad decision endpoint now treats interest-preference persistence failure and impression-event insert failure as errors, rather than returning a seemingly successful ad decision with incomplete telemetry. Decision and event payloads also bound context key/value lengths and key counts; interest values are trimmed and length-bounded. Commits `e236a25`, `26647da`, `9e4cff8`.
- B6-T01 inventory remains in progress; no catalogue schema or pricing policy was changed. B6-T02/T04/T05 remain open until all ten elements of each task are implemented and documented.
- No tests, CI, E2E, SQL execution, RLS validation, accessibility audit or deployment were run.

- Follow-up integrity correction: business advertiser page now captures the promotion-history query error used by its metric guards and history state; the empty-business branch explicitly returns `error: null`. Commit `c8d08d1`.
- Follow-up integrity correction: partner campaign cards now suppress per-campaign impressions, clicks and CTR when the metrics source query fails, instead of rendering fallback zeroes. Commit `75ccf10`.
- These are corrective increments within B6-T02 and B6-T03; neither task is closed. Remaining elements still require implementation-level closure. No tests or validation were run.

- B6-T03 advertiser workspace correction: payment-query failure is now distinct from a campaign with no issued payment; campaign metrics and empty campaign states remain unavailable when their source query fails. Campaign history is exposed per campaign, with an explicit unavailable state on history-query failure. Commits `75ccf10`, `bb12525`, `d3f1e2b`.
- B6-T05 decision endpoint correction: bounded context and interest payloads, explicit failure handling for preference persistence and impression event insertion. Commits `f6105f1`, `ae0487a`.
- B6-T02 history query error capture and previous metrics correction: `c8d08d1`.
- These interventions improve integrity and observability but do not close T02, T03 or T05. Remaining checklist elements require implementation and evidence. No tests, CI, E2E, SQL execution, RLS checks or deployment were performed.

- B6-T02: aggregate investment, impressions, clicks, CTR and history are now suppressed when the advertiser's owned/member/managed-business scope query is incomplete; this prevents apparently complete totals over a partial business set. Commit `4bfa7d4`.
- B6 implementation batch commits since the prior ledger update: decision endpoint hardening `f6105f1`, bounded interests `ae0487a`, partner workspace payment/metrics/history integrity `bb12525` and `d3f1e2b`, business advertiser scope integrity `4bfa7d4`. Documentation update only records implementation; tasks remain open.

- B6-T09 public advertising intake: the request form now guards against repeated submission while pending and recovers from network/invalid-JSON failures with an actionable error instead of remaining permanently stuck in a pending state. Commit `ced000b`.

- B6-T02: both business checkout server actions now reject a malformed or missing RPC success payload unless it contains a valid promotion UUID; this prevents redirecting the advertiser to a false success state without a campaign reference. Commit `e7c6cf5`.
- B6-T01/T05: the business catalogue now excludes paid products with invalid price, duration or capacity configuration; formats without a positive credit price remain visible for MZN checkout but the credit-payment action is disabled and explained. Commits `8bfc40c`, `4a0ddd9`, `9080d03`.
- B6-T05/T09: the business campaign history no longer substitutes zero impressions/clicks when its metrics query fails; it explicitly displays unavailable metrics. Commit `8bfc40c`.
- B6-T03/T09: partner campaign request deep-links no longer silently fall back to a different product when the requested product is unavailable; the user receives a clear return-to-catalogue state. Commit `fa371c8`.
- These are implementation corrections, not closure of their full 10-element tasks. No tests, CI, SQL execution, RLS validation, E2E, accessibility audit or deployment were performed.

- B6-T02: the M-Pesa purchase server action now validates the RPC success payload and requires a valid promotion UUID before redirecting to a success state, matching the existing credit-purchase guard. Commit `9dbe9ad`.
- B6-T05: click attribution deduplication is now serialized in a database transaction using an advisory lock. The new `record_ad_delivery_event_f370` function enforces a recent impression before click, suppresses repeat clicks within 30 seconds for the same visitor/campaign/surface/slot, and writes the event atomically. The API now routes persistence through this function in both direct-Postgres and service-role paths. Commits `4c4de99`, `422a6b1`.
- This removes the prior read-before-write race for click deduplication. It does not close all telemetry requirements: impression deduplication, attribution policy review, operational migration application and runtime validation remain open. No migration execution, tests, CI, E2E, RLS validation or deployment were performed.

- B6-T05 follow-up: the same transaction now suppresses repeated impressions for the same visitor/campaign/surface/slot within five minutes, avoiding repeated refreshes from inflating delivery totals. Commit `4c3dad9`. This is a source-level deduplication policy; its suitability for reporting/billing still requires product and operational validation.

- B6-T05 follow-up: the ad decision endpoint now records impressions through the same atomic database function, in both direct-Postgres and service-role fallback paths. This closes the bypass where decision-generated impressions were still inserted directly and escaped the five-minute deduplication rule. Commit `5722a71`.

- B6-T06: the homepage advertising hero no longer reads `business_promotions` directly or bypasses partner campaign selection and delivery telemetry. It now delegates to the canonical `PublicAd` decision/event component using `HOME` + `HERO`, so homepage delivery, impressions and clicks use the same eligibility and deduplication path. Commit `8ceb402`. Remaining placement work: inventory every live public surface/slot, confirm product-to-slot compatibility and retire only legacy renderers with confirmed unused call sites.


## Deep closure batch — 27/11/2026

### B6-T04 — operational queue and decision controls
- Both public advertising API endpoints now stream-limit request bodies to 16 KiB before JSON parsing, including chunked requests; decision and event payloads still undergo strict schema validation.
- The event endpoint now distinguishes an explicit database deduplication result (`false`) from a missing/malformed RPC result, which is treated as an error rather than silently acknowledged. Commit `e392529`.

- The public advertising proposal intake also now streams a 16 KiB body limit before JSON parsing, rejects invalid date windows (end must be after start when both are supplied), and caps budget/CPM inputs to avoid pathological values.
- The same intake now requires HTTPS for creative-image and destination URLs, and bounds the supplied date string length.
- Public proposal intake now dynamically offers only slot choices compatible with the selected surface, with matching server-side validation so clients cannot submit impossible surface/slot combinations.
- Blank optional budget and CPM inputs are now stored as unset rather than being silently coerced to zero. Commit `1ba49fc`.
- Campaign dates now reject past calendar days while allowing the current date for proposals; the comparison is calendar-day based, not a midnight timestamp comparison.
- Logged-in public ad requesters can now have the request linked to a matching business they own or manage (owner/admin/operator), without attaching an arbitrary same-name business when the match is ambiguous. Commit `6dd31b2`.
 Commits `60094d9`, `881be7e`.

 Commits `7e22bb6`, `8cc60aa`.
 Commit `fb926b6`.
 Commit `a31085b`.
- Corrective queue-search decision: removed the 100-name business lookup from campaign filtering because it could produce incomplete filtered totals for advertisers beyond that sample. Search now stays on fields available directly in the queue; company-name search remains intentionally unsupported until it can be implemented without truncation. Commit `c326da5`.

 Commits `d4e6c2a`, `17e0286`, `2326724`, `5fcefa5`, `e0c4527`.
- Partner campaign moderation and lifecycle changes now notify active members of the partner account for approval, rejection, activation, pause and termination, including the reason captured by the admin action.
- A migration-source defect was found during static review of the public partner catalogue RPC: the new eligibility guard referenced surface/slot variables that were not declared. Added both declarations before migration application. Commit `37e78da`.
 Migration `f390`, commit `fde5995`.

- The administrative advertising queue now supports bounded pagination by source (100 business campaigns, 100 partner campaigns and 100 public requests per page), with previous/next navigation while preserving active filters. Search, status and deadline filters are applied before pagination, and exact filtered totals are displayed per selected origin. This removes the previous hard stop at the first 100 records and makes older operational records reachable. Commits `9ad7e4c`, `ee23a69`, `acd77f6`, `1c98afb`, `2d56561`, `f13cd7e`, `3070d8e`, `b3805c9`, `f9d5ce5`.
- The page-level counts remain explicitly sample/page counts; this is not represented as a global total. Search and filter evaluation still applies to the loaded page window, so a future refinement is needed for fully database-side filtering and global counts.

### B6-T07 — public advertising request settlement evidence
- A public advertising request can no longer be moved from `AWAITING_PAYMENT` to `PAID` using a reason alone. The Super Admin operation now requires a payment channel, a payment reference and a positive settled amount in MZN.
- Settlement evidence is persisted on the request with verifier and timestamp, shown in the operations queue and protected against subsequent mutation. A paid request may advance to `APPROVED`, but cannot be silently cancelled through the ordinary status action; a refund/reversal path must be separately evidenced.
- The business-promotion moderation RPC retains its business-specific call shape; the obsolete four-argument overload is removed to prevent ambiguous resolution against the evidence-aware function.
- Commits: migration `f373` `8e0caa7`, follow-up RPC hardening `173e1be`, immutable evidence guard `0390ea3`, server action `7610ce2` and compatibility correction `aaec750`, admin UI `9fb3506` and conditional evidence payload `06e5989`. Settlement-validation feedback commits `bf973df`, `35b9b3d`.

### B6-T02 / T09 — advertiser payment state and investment integrity
- Business advertisers now receive in-platform notifications for campaign activation, pause, expiry and cancellation from the same status trigger that writes the immutable admin event. The trigger covers both manual decisions and the scheduled expiry reconciler, avoiding a separate notification path and duplicate messages. Migration `f388` commit `872f226`; duplicate manual notification path removed from `f373` in commit `47f53ad`, with unused variables removed in `b0b42bf`.

- The business advertiser history now distinguishes an M-Pesa request awaiting payment from a payment confirmed and awaiting campaign activation. The investment total excludes unpaid requests and credit purchases instead of treating every campaign price as settled MZN investment. Commits `066554a`, `df2846c`.

### B6-T02 / T04 / T07 — business M-Pesa settlement and refund evidence
- Dependency trace found that the business M-Pesa request RPC was persisting `payment_method='DIRECT'`, while cancellation and activation guards expected `MPESA`. The request path now persists `MPESA`, requires a paid catalogue product and non-archived business, and shares the same product-row lock/capacity map as credit purchases, including `PAUSED` reservations. Commit `611ed0c`.
- Added an explicit Super Admin settlement-verification action. It requires the campaign's exact MZN amount and a unique payment reference, records an immutable confirmation record with actor/time, and sets `paid_at` without activating the campaign. Activation remains a separate reasoned administrative decision. Migration `f381` commit `20a5395`; action `d753b13`; admin interface `32ddf3f` and `fe83981`; advertiser status `2ddad67`.
- Business campaign activation now also rejects a campaign whose contracted end date has already passed, even if payment is settled. The Super Admin receives a date-specific reason rather than activating an undeliverable campaign. Commits `d580a7a`, `8ea8868`, `4a485e5`.
- Paid M-Pesa business campaigns can no longer be cancelled without an external refund reference distinct from the original payment reference. The refund path also permits cancellation of a PENDING campaign whose contracted period has elapsed without activation, so a paid but never-delivered campaign is not trapped by the ordinary pre-start cancellation rule. Commits `31bd0d0`, `9b861c7`. The reference is recorded in the immutable cancellation ledger; unpaid pending requests may still be cancelled without a refund. Migration `f382` commits `32baa93`, `7aadd5e`, `df461a1`, `2e816e5`, `29f657e`; action `d15dac2`, `01e941d`; interface `4ec8bad`, `dcb841e`.
- The current business M-Pesa path is now an auditable request-and-manual-settlement workflow, not a verified provider-initiated checkout. Automatic M-Pesa collection/callback integration for advertising campaigns remains a DOD gate; do not describe this flow as an automatic gateway payment.

- Partner campaigns paid but left in `APPROVED` until their contracted end date can now be cancelled/refunded after expiry even when their start date has passed. The action still requires a confirmed payment order and the existing external refund reference for M-Pesa/bank transfer; credit refunds remain ledger-compensated. Migration `f383` commits `3ee781b`, `b3ca7f4`; admin interface `a254e5b`.

### B6-T01 / T02 — catalogue-to-delivery contract
- The business advertiser catalogue now labels the Opportunities placement in Portuguese rather than exposing the raw enum value. Commit `6feeee1`. The purchase form now exposes Opportunities as a selectable placement and clearly states that the current M-Pesa request is manual settlement, not an automatic operator charge. Commits `b7b9189`, `9bcf4a4`. Partner campaign request RPCs now reject internal/non-public product surfaces and the partner catalogue no longer offers `PARTNER_INTELLIGENCE` as a public ad format. Migration `f389` commits `c0723a8`, `7fbfdd1`.
- Catalogue surfaces now fail closed in the partner request catalogue and business advertiser product picker when a paid format lacks a valid canonical surface/slot. This prevents the UI from offering a format that the database cannot deliver. Commits `1b74e9d`, `70b0948`.

- A critical delivery gap was found: business credit and M-Pesa purchase RPCs persisted the product placement but omitted the product `slot`. The decision engine requires an exact surface/slot match, so newly purchased business campaigns could remain undeliverable despite successful purchase. Both purchase paths now persist `v_product.slot`; the M-Pesa override in `f381` carries the same fix. Commits `6c65691`, `b89f449`.
- Legacy business placement values now normalize to canonical surfaces/slots, and product-backed campaign rows inherit the catalogue's authoritative surface/slot. Commits `e6b2220`, `0b24ca8`.
- New NOT VALID catalogue constraints require positive direct prices and valid non-null slot/surface combinations for new or changed paid inventory while allowing legacy rows to be remediated without blocking migration. Commits `c5a4d11`, `769a12f`, `f67de02`, `191cac5`. The constraints allow inactive products and terminal campaigns to be retired even when legacy metadata is incomplete. Existing-row validation and cleanup remain open until the deployed data can be inspected.

### B6-T01 / T03 / T08 — capacity reservation integrity
- Partner ad inventory capacity now includes `APPROVED` and `PAUSED` campaigns in overlap checks. An approved campaign reserves the contracted space while awaiting activation; pausing a campaign does not free capacity for a second sale. Commit `bac01aa`.
- Business credit-backed ad purchases now count `PAUSED` campaigns in product-capacity checks, preventing a paused campaign from releasing inventory while it can still be resumed. Commit `28cee94`.
- The partner and business changes are source-level database implementations; they remain dependent on migration application and operational verification.

### B6-T05 — attribution integrity and authoritative admin metrics
- Ad event validation now requires an exact campaign surface and slot match. Business events are validated against the campaign's persisted `placement` (aliased as its surface), rather than accepting any surface when the source was a business campaign. Commits `16e500b` and `582b5e2`.
- The Super Admin campaign table no longer relies on denormalized `impressions_count` / `clicks_count` columns for its per-campaign totals. A bounded, role-checked RPC aggregates the authoritative `ad_delivery_events` rows for the campaigns on the current page, with a supporting index. If the RPC fails, campaign metrics and CTR are suppressed rather than shown as zero. Commits `0c53dfc`, `8c2d0cb`, `b867b3b`, `4c27770`.
- This aligns the admin campaign view with the event pipeline, but does not yet establish commercial conversion attribution or ROI.

### B6-T05 / T06 — atomic eligibility and public inventory coverage
- The event persistence function now locks and re-reads the campaign row in the same transaction that records the impression/click. It rejects events if the campaign is no longer active, is outside its start/end window, or does not exactly match the submitted surface and slot. This closes the pause/expiry race between the API eligibility read and event insert. Commit `bbc1368`.
- The event API maps a campaign that became ineligible during that transaction to HTTP 409, rather than reporting a generic server error. Commit `3aad633`. The transaction timestamp is now captured after the campaign row lock, avoiding stale eligibility when a concurrent status update holds the row. Commit `7feae7b`. The decision endpoint also maps this race to HTTP 409 in both database connection paths. Commits `cdbd57d`, `6cde7ff`.
- Billboard creative labels and accessible names now distinguish partner campaigns from business advertising instead of labelling every billboard as an exclusive partner placement. Commit `06bda45`.
- Homepage `HOME/HERO` and `HOME/BILLBOARD` inventory now use the canonical delivery component; directory featured placements no longer query and render active promotions directly, and instead use the canonical decision/event path. Marketplace now exposes `BILLBOARD` and `FEATURED` alongside its existing `EXCLUSIVE` slot; Opportunities exposes `FEATURED` alongside its existing `BILLBOARD`. Commits `e563bc9`, `4c1f655`, `bcd1eb5`, `fa5825e`, `7ca44cc`.
- Legacy business placements (`DIRECTORY_BILLBOARD`, `DIRECTORY_FEATURED`, `DIRECTORY_SIDEBAR`, `DIRECTORY_INFEED`) now normalize to canonical `DIRECTORY` surface/slot keys; product-backed campaigns inherit the product catalogue's authoritative placement and slot. Migration `f385` commits `e6b2220`, `0b24ca8`.
- Directory `INFEED` now has an insertion point after the sixth company result (or the final result on shorter pages), completing the legacy directory in-feed mapping. Commits `63157eb`, `7fc3d5e`.
- Partner `INFEED` and `CONTEXT` formats now have actual public insertion points: marketplace and opportunities in-feed positions are inserted after the sixth result (or the final result for shorter feeds), and directory contextual inventory is exposed with the active search context. Commits `f65fc88`, `cd25e6b`, `78d7319`, `6e9812e`, `4041014`.
- Homepage partner sponsorship codes now map to canonical `HOME/HERO` and `HOME/EXCLUSIVE` slots, and the `home_ad_slots` RPC returns the persisted canonical slot rather than the legacy `PREMIUM` alias. The homepage no longer consumes that RPC; its exclusive sponsorship uses `PublicAd`, while the former dynamic premium/exclusive cards are now ordinary editorial discovery cards. Commits `2154939`, `8a77a94`.
- The homepage presence strip no longer elevates businesses merely because they have an active `FEATURED` promotion in another surface. This removes a cross-surface paid exposure that had no matching HOME impression/click telemetry. Commit `8d48d15`.
- The legacy `home_ad_slots` function remains in the database for compatibility, but the homepage no longer calls it. Its external consumers and the final deprecation/removal decision remain to be traced.

### B6-T08 — expiry reconciliation
- Added service-role-only, idempotent database function `reconcile_advertising_campaign_expiry_f376()`. It transitions expired active business promotions to `EXPIRED` and expired active/paused partner campaigns to `ENDED`, setting explicit system reasons so the existing immutable lifecycle event triggers capture automated expiry. Commit `c33c0bf`.
- Added conditional scheduling migration `f379`: when `pg_cron` is available it registers one idempotently named job to reconcile expiry every 15 minutes; when the extension is unavailable it emits a notice and leaves the external scheduler requirement explicit. Commit `10ff422`. The migration has not been applied, so scheduler availability and job registration are not yet confirmed.
- Follow-up dependency trace found an existing partner-only expiry cron (`F369`) that also inserted status events manually despite an existing status trigger. Migration `f380` replaces that legacy function with a wrapper around the unified reconciler and consolidates both schedules into one 15-minute job, avoiding parallel expiry jobs and duplicate event writes. Commit `7bdf7ae`. This consolidation is source-only until migrations are applied.

### Remaining B6 Definition of Done gates
1. T01: reconcile every active product with a real public surface/slot and verify catalogue invariants in the deployed database.
2. T02: finish the business M-Pesa request/callback and recovery trace, including ambiguous outcomes and duplicate retries.
3. T03: finish partner campaign payment retry, payment method reconciliation, and user-visible cancellation/refund outcomes.
4. T04: database-side search/status/deadline filters, exact per-origin totals and bounded pagination are implemented at source level. Remaining gate: complete settlement and audit trail coverage across every business/partner/request action, plus deployed verification.
5. T05: finalize attribution/conversion policy and verify event counts against the deployed event pipeline; current CTR is interaction, not ROI.
6. T06: source-level placement coverage is now implemented for HOME (HERO/BILLBOARD/EXCLUSIVE), DIRECTORY (BILLBOARD/FEATURED/CONTEXT/INFEED), MARKETPLACE (BILLBOARD/FEATURED/EXCLUSIVE/INFEED) and OPPORTUNITIES (BILLBOARD/FEATURED/INFEED). Remaining T06 gate is deployment/runtime verification and confirming there are no external consumers of the retained `home_ad_slots` compatibility RPC before removal.
7. T07: reconcile partner financial documents, M-Pesa, bank transfers, credit ledger and compensating refunds end-to-end.
8. T08: race-safe expiry transitions and a consolidated 15-minute scheduler are implemented at source level. Remaining gate: apply migrations, confirm the single cron job is registered, and reconcile legacy expired/paused/cancelled rows.
9. T09: complete the advertiser recovery journey for failed, pending, rejected and expired campaigns.
10. T10: finish cross-module consolidation and collect operational evidence.

No tests, CI, E2E, SQL execution, RLS validation, telemetry verification, accessibility audit or deployment were run. New B6 migrations `f373` through `f388` are committed as source only and have not been applied; earlier B6 telemetry migration `f370` is also pending application where not already deployed.


### B6-T03 / T04 — bounded partner payment lookup and queue filter integrity (27/11/2026)
- Partner advertising workspace payment-order lookup is now restricted to the campaign IDs returned for the authenticated partner account, rather than requesting all payment orders visible through the table policy. Empty campaign lists skip the payment query. This reduces unnecessary payment-row retrieval and keeps the latest-order map scoped to the workspace. Commit `57e18cb`.
- Super Admin campaign search input now removes PostgREST structural/wildcard characters and control characters before constructing the OR/ILIKE expression, reducing the risk that punctuation changes the search expression. Commit `fc79c6e`.
- The administrative queue now treats its database query filters as authoritative and no longer re-applies a different client-side search/deadline filter to the fetched page. This removes the previous mismatch where company/display fields and a second clock could cause the visible page to disagree with query-level counts. Commit `252f0a7`.
- These source changes improve query scoping and filter/count consistency. They do not constitute database execution, tests, security validation, or deployment evidence.

### B6-T02 / T09 — advertiser duplicate-submit prevention (27/11/2026)
- The business advertiser campaign form now switches to a processing state on submission and disables both credit and M-Pesa request actions until the server action completes navigation. This reduces accidental duplicate campaign/payment requests from repeated clicks; the database locking and payment guards remain the authoritative protection. Commit `8d534e0`.
- Remaining payment retry, gateway callback and ambiguity-recovery gaps are not represented as solved by this client guard.

### B6-T03 / T04 / T08 — paid partner campaign activation path (27/11/2026)
- Static source review identified a dead transition: a partner campaign settled by bank transfer could remain `APPROVED`, while the administrative state selector offered no `ACTIVE` transition and the RPC state machine rejected that transition. Migration `f391` adds reason-required `APPROVED → ACTIVE` only when payment is confirmed and the current time is inside the contracted start/end window. Paused campaigns can resume only within that same valid window.
- The Super Admin queue now exposes activation only for paid campaigns currently inside their delivery window and reports start-date/window errors explicitly. Commits `3e8a32d`, `92f3796`, `52ab7a6`, `8e22524`.
- This closes the source-level activation dead-end for bank-transfer campaigns; the migration is not applied and the lifecycle still requires deployed-state verification.

### B6-T03 / T09 — partner request error disclosure (27/11/2026)
- Unknown partner campaign request errors now return a neutral, actionable Portuguese message instead of exposing the raw Supabase/PostgreSQL RPC error text in the form. Known errors remain mapped to specific user guidance. Commit `86c1788`.


### B6-T07 / T08 — 24-hour bank transfer confirmation/activation deadline (27/11/2026)
- F392 adds `expires_at` to financial payments and automatically assigns pending `BANK_TRANSFER` intents a deadline anchored to `created_at` plus 24 hours. Existing pending transfer records receive the same deterministic expiry.
- The Super Admin partner bank-transfer settlement RPC now rejects late confirmation and returns `BANK_TRANSFER_CONFIRMATION_EXPIRED`; it validates the payment remains pending and the transfer expiry is still in the future before mutating payment, invoice or campaign state.
- Public advertising requests cannot be marked `PAID` by bank transfer if the request is older than 24 hours; the admin action/UI displays a specific expired-confirmation message.
- Paid, approved partner campaigns awaiting activation have a separate activation deadline of 24 hours from recorded bank-transfer settlement. After that deadline, cancellation/refund becomes eligible, with external refund reference required for bank transfer and cancellation/refund evidence retained. The admin campaign card shows the activation deadline and whether the window has expired.
- Implementation commits: `3dfef54`, `2c8a2f2`, `8713c69`, `4f7d2d3`, `d4a52cb`, `7e91674`, `26fe496`.
- F392 is source-only at this stage: migration application, SQL behaviour, deadline display under real payment records, and operational refund execution remain unverified. No deadline is represented as an automatic refund or automatic campaign activation.

- Additional scope for F392: credit purchases by bank transfer are also limited to a 24-hour confirmation window. The credit purchase decision RPC rejects Super Admin approval after the window; the admin and advertiser histories now display the deadline. Commits `d24c063`, `0c1ebe3`, `862d3f5`, `5df4613`, `cf331ea`, `2a16669` (UI/source corrections are source-only, not validated).
- Financial history for managed businesses now displays the pending bank-transfer payment expiry and warns when the 24-hour window has passed. Commit `2b149ff`.


### B6-T07 — F392 source correction (27/11/2026)
- Static comparison against the established F326L settlement RPC found that the first F392 rewrite had dropped campaign payment-order integrity checks, settlement amount reconciliation, and the `PAID` transition for partner campaign payment orders. The function was restored from the F326L implementation and the 24-hour deadline guard inserted without removing the original checks. Commit `fe2c1c6`.
- The advertising request and credit purchase deadline checks were also changed from brittle dynamic function-definition rewrites to explicit `CREATE OR REPLACE FUNCTION` definitions copied from their established migrations, with only the deadline guard added. Commits `9c73206` and `5948365`.
- Static inventory of transfer-enabled flows: partner back-office invoices/financial payments share the F392 confirmation RPC; public advertising requests have their own evidence-based PAID transition; credit purchase requests have a separate Super Admin decision RPC. Pending bank-transfer financial payment rows carry a 24h expiry, and the other two flows calculate the deadline from request creation. The service-order flow found in the source inventory uses its own payment channel and was not found to offer BANK_TRANSFER in the reviewed path.
- These edits are source-only and were not tested or applied. The 24-hour rules are enforcement gates, not automatic activation, refund, or money movement. The fixed platform closure percentage remains **89%**.


### B6-T08 — Purchase/request UI consistency fixes
- Fixed a missing `submitting` state declaration in the self-service advertising purchase component that would prevent the purchase UI from compiling/rendering correctly, and constrained the displayed selected product to the currently selected duration/placement instead of accidentally using a stale product from another selection. Commit `f080452`.
- Public advertising request API now accepts the `EXCLUSIVE` and `CONTEXT` slot values already offered by the surface-specific form validation, preventing legitimate requests for these positions from being rejected by the API schema. Commit `029b20d`.
- Public audience targeting input is now deduplicated, normalized, bounded to 20 distinct entries per field and 120 characters per entry. Oversized lists receive a controlled 400 response rather than being passed into the database. Commit `d7a11ad`.
- Admin partner-campaign cancellation now maps the F392 24-hour activation-window guard to a clear user-facing message, rather than a generic cancellation failure. Commits `81b908f` and `cd0914a`.
- Source-only changes. No tests, builds, SQL validation, database migration application, or deployment performed.


### B6-T09 — Event validation fallback correction
- Static inspection of the ad event endpoint found a fallback-mode schema mismatch: business promotions were fetched without their `placement` field, while eligibility requires a normalized surface. The fallback now fetches `placement` and maps it to the eligibility surface; partner campaigns continue to use their explicit `surface`. This prevents valid business ad events from being rejected when the direct Postgres connection is unavailable. Commit `0b9c345`.
- Source-only; no runtime or database validation.

### B6-T02 / T03 — checkout date parsing and partner workspace runtime correction (27/11/2026)
- Corrected the Maputo-local start-date parser for date-only inputs. The previous parser appended a timezone directly to `YYYY-MM-DD`, which is not a valid ISO date-time representation; date-only values now resolve to local midnight in the Maputo UTC+02:00 zone, while explicit timestamps/timezones retain their supplied time semantics. Commit `101872c1be9c562388890b7adae54ff7ee0bf4ba`.
- Corrected the partner advertising workspace payment lookup. Its previous `Promise.all` initializer referenced the `campaigns` binding before the destructuring assignment had completed, triggering a temporal-dead-zone runtime error. Campaigns are now loaded first and payment orders are queried only for those campaign IDs. Commit `131f5dc38f359e4fec95b6b84de595223ea2978f`.
- Both corrections are source-only. No tests, builds, SQL execution, migration application, or deployment were performed.

### B6-T09 — public advertising request date validation hardening (27/11/2026)
- Reworked public advertising request date parsing to handle date-only values as Maputo-local midnight, validate timestamps before any formatting operation, compare calendar dates in the Maputo UTC+02:00 timezone, and reject invalid periods without allowing an invalid date to throw during schema refinement. Commit `d6353f1f54b437771613361102942b67933b43db`.
- Source-only correction; no tests, builds, SQL execution, migration application, or deployment were performed.

### B6-T03 / T09 — partner campaign request recovery (27/11/2026)
- The partner campaign request form now prevents duplicate submission, captures network/unexpected RPC failures, restores the submit state in every outcome, and resets the captured form element safely after a successful request. Previously an uncaught network exception could leave the form permanently pending. Commit `e75dfb80b85aa9bc84fb22f8041cfe397ef8dabe`.
- Source-only; no tests, builds, SQL execution, migration application, or deployment performed.

### B6-T03 / T09 — partner audience target validation (27/11/2026)
- Partner campaign requests now validate the same target contract enforced by the database before sending: maximum 20 entries, approved target types only, non-empty values and a 160-character limit. This avoids silently discarded target types and database-side truncation of oversized values. Commit `59cf890a7e0cd45b4073d2bd3bde34837b5187cd`.
- Source-only; no tests, builds, SQL execution, migration application, or deployment performed.

### B6 — lote funcional: checkout empresarial, datas e entrega pública (27/11/2026)
Este lote fecha em conjunto três pontos de consistência entre formulário, API e apresentação pública:
- **Pedidos comerciais:** datas introduzidas como data local de Moçambique são agora normalizadas para ISO UTC antes da persistência, tanto no caminho PostgreSQL directo como no fallback Supabase. A validação e o valor gravado passam a usar a mesma interpretação UTC+02:00; timestamps com fuso explícito preservam esse fuso. Commit `83218563573e8ad653a538ed4e59cb24628ca5df`.
- **Checkout empresarial:** o ID submetido acompanha o produto realmente seleccionado para a duração activa; deixou de existir fallback silencioso para um produto de outra duração. Quando o catálogo não contém formatos pagos elegíveis, o formulário apresenta estado vazio explícito e não permite iniciar uma compra sem produto. Commit `d00bce94f1958a0adb7cb84c1bff303f9563bfaf`.
- **Entrega pública:** ao mudar de superfície/posição/audiência, a peça anterior é removida enquanto a nova decisão é carregada; pedidos antigos são abortados e respostas tardias não podem repor uma peça fora do contexto actual. Commit `5a06e0f2333efcd70f84c6a9d8d69aab780b1334`.
- Este lote é apenas de código-fonte. Não foram executados testes, builds, validações SQL, migrações ou publicação.

### B6 — lote funcional: reconciliação integral do fim de campanha (27/11/2026)
- A revisão do ciclo de vida identificou que a função unificada de expiração terminava campanhas empresariais apenas em estado `ACTIVE`; campanhas `PAUSED` que ultrapassassem o fim contratado continuavam reservadas e não eram libertadas pelo reconciliador.
- Adicionada a migração F393, que passa a encerrar campanhas empresariais em `ACTIVE` ou `PAUSED` quando `ends_at <= clock_timestamp()`, mantendo o encerramento idempotente das campanhas de parceiros e as permissões restritas a `service_role`. Commit `51288e335b5d3a3bc137eeba18108ebc5b4301db`.
- A migração histórica F376 foi restaurada sem alteração permanente, preservando a sequência de migrações já existente. Commit de restauração `91716982e0ffa52379dc30e620a41e57105cce9f`.
- A F393 está apenas no repositório; não foi aplicada. A execução efectiva depende da aplicação das migrações e da disponibilidade do agendador configurado.

### B6 — lote de segurança das funções financeiras (27/11/2026)
- A revisão das funções de liquidação identificou que a F392 redefiniu `admin_confirm_partner_bank_transfer` com `search_path=public,pg_temp`, abaixo do padrão catalog-first aplicado às restantes funções privilegiadas deste módulo.
- A migração F394 altera a configuração persistente da função para `pg_catalog,public,pg_temp`, sem reescrever a lógica de liquidação, os controlos de prazo ou os efeitos contabilísticos. Commit `446f7ba3480ae33b42807fd021760cf57646791f`.
- Migração ainda não aplicada; nenhuma execução ou validação SQL foi realizada.

### B6 — lote funcional: estados comerciais e moderação de pedidos (27/11/2026)
- A reconciliação entre interface, Server Action e RPC identificou que o painel oferecia `CANCELLED` para pedidos já marcados como `PAID`, embora a função transaccional F392 só permita a transição `PAID → APPROVED` para preservar a evidência de liquidação.
- Alinhada a matriz de transições da Server Action com a regra transaccional e limitada a lista de opções do painel aos estados permitidos para o estado actual do pedido. O operador deixa de poder seleccionar transições que o servidor necessariamente rejeitaria. Commits `239240b1e47ea395185fd776fae167b67e007483` e `f0125e9436cd3f7e29e18d92e801bb17865b04e5`.
- Fonte apenas; não foram executados testes, builds ou operações de base de dados.

### B6 — lote funcional: elegibilidade visível de cancelamento e reembolso bancário (27/11/2026)
- O painel apresentava a acção de cancelamento de campanhas de parceiros pagas por transferência bancária antes de terminar a janela de activação de 24 horas. A base de dados recusava correctamente a operação, mas a interface permitia iniciar uma acção inelegível.
- A elegibilidade passou a considerar o método de pagamento, estado da campanha e hora de confirmação: para campanhas `APPROVED` pagas por transferência bancária, o formulário de cancelamento só aparece depois de decorridas 24 horas; para os restantes casos mantém-se a regra de campanha futura ou aprovada já expirada. Commit `d8e0cc579408f9993f3acb79b88c3fe6362b0cee`.
- Código-fonte actualizado; sem testes, build, execução SQL ou aplicação de migrações.

### B6 — correcção de dados necessários à elegibilidade de reembolso (27/11/2026)
- A implementação da regra de visibilidade das acções de cancelamento revelou que a consulta da fila administrativa não carregava `confirmed_at` da cobrança de parceiro. Sem esse campo, a interface não conseguiria determinar o fim das 24 horas, mesmo depois de o prazo ter expirado.
- A consulta agora inclui `confirmed_at`, permitindo ao painel aplicar a mesma referência temporal usada pela regra de reembolso. Commit `761386fbcdc6abae7dc198938db513debf534cce`.

### B6 — lote funcional: reconciliação de cobranças e histórico de campanhas de parceiros (27/11/2026)
- A fila administrativa carregava a relação de cobranças sem ordenação garantida e utilizava o primeiro elemento como se fosse sempre a cobrança mais recente. Com reemissões após falhas, isso podia apresentar um estado antigo, permitir uma nova emissão indevida ou ocultar a cobrança efectivamente paga.
- A consulta foi separada e passou a carregar as ordens de pagamento dos IDs da página, ordenadas por `created_at DESC`; o painel associa apenas a cobrança mais recente a cada campanha. Falhas nesta consulta também passam a marcar a fila como incompleta e a ocultar os indicadores agregados. Commits `e372865767508c014ad67ec2208f8380ab6c2297` e `eed7de43d509b88c0f58498af7dcb2f4a4b325c6`.
- Correcção de fonte; sem execução de testes, builds ou consultas à base de dados.

### B6 — lote funcional: transferência bancária de campanhas de parceiros, da emissão à confirmação (27/11/2026)
A reconciliação da F392 revelou que a confirmação bancária estava parcialmente preparada, mas o fluxo de emissão não criava os vínculos necessários para a confirmação encontrar a campanha:
- O catálogo de ordens de pagamento só aceitava `MPESA` e `CREDITS`, apesar de a rotina de confirmação exigir `BANK_TRANSFER`.
- A emissão não preenchia `financial_payments.campaign_id`, pelo que a rotina F392 não conseguia localizar a ordem/campanha correspondente.
- A administração não disponibilizava transferência bancária como método de emissão nem um formulário para confirmar a cobrança.

**Intervenção integrada:**
- F395 amplia o método permitido na ordem de pagamento, estende a RPC atómica existente para aceitar `BANK_TRANSFER` e grava o `campaign_id` na linha financeira, preservando o preço negociado e a protecção de preço fixo do catálogo. O gatilho de expiração F392 passa assim a atribuir o prazo de 24 horas à cobrança criada. Commit `da6ad6f4f9a2c12f519a39cc19a282ae698caf49`.
- A Server Action passou a aceitar o método bancário e a chamar a rotina de confirmação com validação de Super Admin, tratamento de erros e revalidação das áreas relevantes. Commit `8990af0e106838ce749a2868d47f2123591bdb61`.
- A fila administrativa passou a oferecer a emissão bancária, apresentar o prazo de confirmação e permitir confirmar apenas através do registo financeiro associado; a mensagem de sucesso/expiração foi alinhada. Commits `0b3055e1eed83ecd7debb4501b32639d10732ad9`, `43f6f9715655a485a519593ecdeb117444a78d3a`, `ec58a0a98db2377ba8b41e0ecafcf1ac47cc399f` e `30314e86e878dbefbac42446f86377bfbddddcbd`.
- Migração e interface ainda não foram executadas em ambiente. O fluxo permanece por validar após aplicação da F395 e das migrações anteriores.

### B6 — lote funcional: ciclo bancário visível também para a conta parceira (27/11/2026)
- A conta parceira não apresentava o prazo de 24 horas da transferência bancária. O painel de parceiro passa a consultar o registo financeiro associado, apresentar a data/hora limite e distinguir transferência bancária pendente de M-Pesa pendente.
- A mesma intervenção corrigiu a reutilização do identificador de campanhas no carregamento de pagamentos, evitando colisão de declaração no componente de página.
- Commit `18238dbac01b61dc0a60fdd01efb643b7afc61a9`. Fonte apenas; não foram executados testes ou builds.

### B6 — lote funcional: recuperação de transferências bancárias expiradas (27/11/2026)
- A revisão do fluxo revelou que, embora a cobrança bancária expirasse após 24 horas, a ordem de campanha permanecia em `PENDING`; a emissão seguinte era bloqueada como cobrança já existente. A F396 permite à RPC de emissão reconhecer uma ordem `BANK_TRANSFER` pendente cujo registo financeiro já expirou, marcar a tentativa anterior como `FAILED`, anular o documento financeiro ainda emitido e reutilizar a ordem para uma nova tentativa com novo prazo.
- O painel administrativo passa a disponibilizar “Reemitir cobrança” apenas quando a transferência expirou, mantendo bloqueada a reemissão enquanto a cobrança ainda está dentro do prazo. A conta parceira passa a distinguir o prazo expirado de uma transferência ainda pendente.
- Commits `36a43178827923ab210646aabe9cb62033e0c05b`, `d9f82261addca536c5e57d593e323fabfcae9579`, `9d4b19e99b41e62b2f702231c5f67db6995a472d` e `caa85ec88c032aaf7ef04719551c044c904cab72`.
- Migração ainda não aplicada; o fluxo necessita de validação integrada após aplicação de F395/F396.

### B6 — lote de coerência entre regras e testes de regressão (27/11/2026)
- Corrigido um teste legado que aceitava campanhas sem superfície/posição canónica, em contradição com a regra de elegibilidade efectivamente aplicada pelo motor de entrega.
- Acrescentado caso de regressão para datas de início sem hora, confirmando a interpretação de meia-noite no fuso de Maputo e a rejeição de datas locais já passadas.
- Commits `599506ae9042f039a95fe6302db0707f91b60e51` e `6d2a1082170b32c9a39c2e1acf8681e005e50482`. Os testes foram actualizados, mas não executados.

### B6 — lote funcional: cancelamento de campanhas empresariais pausadas (27/11/2026)
- O ciclo de cancelamento empresarial aceitava apenas campanhas `PENDING` e `ACTIVE`, deixando uma campanha `PAUSED` com início futuro sem caminho administrativo para cancelamento e reembolso, apesar de continuar a reservar inventário.
- F397 alarga a mesma função auditada de cancelamento a campanhas `PAUSED`, mantendo a restrição temporal: campanhas cujo período já começou continuam inelegíveis, excepto a regra existente para pedidos pendentes já expirados. O painel passa a expor a acção para campanhas pausadas elegíveis.
- Commits `83fac08b6e77ebf1a46948b578f2db2cfff561bb`, `c9b773282628f583567895343a9a8bb614d5941d` e `d85de67f2ce457bb46585413625969c5557201c5`. Migração não aplicada.

### B6 — lote funcional: comunicação da liquidação bancária ao parceiro (27/11/2026)
- A confirmação bancária altera a ordem e o documento financeiro, mas uma campanha já colocada em `APPROVED` não sofre nova transição de estado; por isso, a notificação de mudança de estado não informava os membros da conta de que o pagamento tinha sido confirmado.
- F398 acrescenta notificação explícita aos membros activos da conta parceira após a confirmação bancária, sem duplicar a notificação de estado nem alterar as regras de liquidação. Commit `236f4ca50fd957a6d654d26280e20e951962a348`.
- Migração não aplicada; notificação ainda não foi verificada em ambiente.

### B6 — lote funcional: activação alinhada com a data contratada (27/11/2026)
- A emissão por créditos activava imediatamente uma campanha de parceiro, mesmo quando a data de início contratada ainda era futura. Embora o motor de entrega respeitasse a data, o estado administrativo ficava prematuramente `ACTIVE`.
- F399 mantém o débito atómico dos créditos, mas coloca a campanha em `ACTIVE` apenas quando o instante actual está dentro do período contratado; antes do início ou depois do fim permanece `APPROVED`, permitindo a decisão administrativa adequada e a recuperação/refund quando aplicável.
- A mensagem de sucesso do painel deixou de afirmar que toda a compra por créditos activa imediatamente a campanha.
- Commits `9ccf08b002ca4ea01999fe1c64bb5decc8afa55c`, `3823a50bf4041fc188030f10535961af67924bbe` e `19020ddc85bd7df30817148af9abda4e00fc4039`. Migração não aplicada.

### B6 — lote funcional: activação por confirmação M-Pesa alinhada com o período (27/11/2026)
- A mesma activação prematura encontrada no fluxo de créditos existia no callback M-Pesa: a confirmação do operador mudava qualquer campanha `APPROVED` para `ACTIVE`, mesmo que o início contratado ainda fosse futuro ou o período já tivesse terminado.
- F400 mantém a liquidação idempotente, mas só activa a campanha se o instante estiver dentro do intervalo contratado; nos restantes casos conserva `APPROVED` para activação administrativa no momento correcto ou cancelamento/estorno se o período já tiver expirado. A função também recebe configuração catalog-first de `search_path`.
- Commit `7ceec52758f674e66b4c428451bc225cff92a070`. Migração não aplicada nem validada.

### B6 — lote de segurança das rotinas de pagamento de publicidade (27/11/2026)
- A revisão das funções privilegiadas de emissão, confirmação e falha de pagamentos de campanhas identificou que ainda mantinham o caminho de resolução herdado `public, pg_temp`. F401 define explicitamente `pg_catalog, public, pg_temp` nas três RPCs, sem alterar a lógica de liquidação ou as permissões de execução.
- Commit `6063f6fb2dd9aa7fad7ef2386c40e654b3b84437`. Migração não aplicada.

### B6 — lote operacional: robustez da instalação do agendador de expiração (27/11/2026)
- A criação do agendador dependia de instalar `pg_cron` num schema explicitamente indicado como `pg_catalog`, embora a rotina utilize o schema próprio `cron`. A criação passou a respeitar o schema predefinido da extensão e F402 garante a instalação quando disponível, remove a duplicação do job pelo nome e agenda uma única reconciliação a cada 15 minutos.
- Quando `pg_cron` ou `cron.job` não estão disponíveis, a migração deixa um aviso explícito de que é necessário um agendador externo; não declara o processo activo.
- Commits `30270f35f9cc87660a2f92891c163545110ec164` e `3d552febdbddb46b809de8428289f7d4455a2a44`. A existência efectiva da extensão/job só poderá ser confirmada após aplicação e verificação no ambiente.

### B6 — robustez da identidade de visitante para medição publicitária (27/11/2026)
- A chave de visitante podia ser reutilizada sem validar o tamanho e o fallback sem `crypto.randomUUID` não garantia o mínimo exigido pela API. A geração agora valida chaves existentes e garante um identificador dentro dos limites aceites pelo contrato de eventos.
- Commit `4a9139d14196a287a447b5976cbfc927062bf49a`.

### B6 — lote funcional: compatibilidade de segmentação nas superfícies públicas (27/11/2026)
- As páginas públicas podiam passar consultas, localizações e interesses sem limite prático para o componente de publicidade, enquanto a API impõe limites de tamanho e cardinalidade. Uma pesquisa longa podia invalidar a decisão publicitária e também o evento de clique.
- O componente passou a normalizar e limitar contexto e interesses antes de enviar a decisão e o clique, mantendo os mesmos valores seguros ao longo do ciclo de medição. Commit `f03151b6a6520cd0297dfd24beaf520e5cc54782`.

### B6 — lote funcional: notificação de liquidação M-Pesa em campanhas futuras (27/11/2026)
- A confirmação M-Pesa podia liquidar uma campanha sem alterar o estado quando a data de início era futura; nesse caso, o evento de estado não gerava notificação e o parceiro não recebia confirmação explícita do pagamento.
- F403 acrescenta notificação de liquidação aos membros activos da conta parceira após a confirmação do callback, independentemente de a campanha poder ser activada imediatamente ou ter de aguardar a data contratada.
- Commit `483a3f5f45a43f5c2cbc0a1d14b5dede86af95c4`. Migração não aplicada.

### B6 — lote funcional: recuperação de falhas M-Pesa e comunicação ao parceiro (27/11/2026)
- O callback de falha M-Pesa actualizava a ordem para `FAILED`, mas não notificava os membros da conta; a falha podia ficar visível apenas quando o parceiro abrisse o painel.
- F404 envia uma notificação após a transição efectiva para `FAILED`, informando que a tentativa não foi concluída e que pode ser emitida nova cobrança. Retornos idempotentes de falhas já processadas não geram notificações duplicadas.
- Commit `0be97096fcfd9f882222c11077064cc1edc4a879`. Migração não aplicada.

### B6 — correcção do marco inicial das 24 horas nos pedidos comerciais (27/11/2026)
- A revisão identificou que a F392 contava as 24 horas de transferência bancária dos pedidos públicos de publicidade desde `advertising_requests.created_at`, que representa a entrada inicial do contacto comercial e pode anteceder em vários dias a proposta e a emissão das instruções de pagamento.
- F405 cria `bank_transfer_expires_at`, inicia o prazo quando o pedido entra em `AWAITING_PAYMENT`, permite ao Super Admin renovar esse estado para emitir novo prazo de 24 horas e valida a confirmação contra esse prazo específico. Os pedidos já em `AWAITING_PAYMENT` recebem uma janela inicial de 24 horas na migração.
- A fila administrativa passa a apresentar a data/hora limite e o estado expirado, e oferece explicitamente a renovação do prazo.
- Commits `a8926c6cc1f47850673a7acd894b6f32f4715fab`, `53a81977e0cd479a7c1bbff2c60d1efda99f13ae` e `1fb2ad421f28ee9443ad93912a861c482ba0165c`. Migração não aplicada.

### B6 — correcção do intervalo inclusivo de datas dos pedidos públicos (27/11/2026)
- O formulário comercial recolhe datas de calendário sem hora. A normalização anterior interpretava início e fim à meia-noite, tornando impossível um pedido de um único dia e terminando campanhas no início da data final.
- O início passa a ser meia-noite de Maputo e o fim passa a ser o último milissegundo da data final em Maputo. A mesma interpretação é usada na validação e no valor persistido. Commit `f2a6f1b0ae3aa14fe4408e895da3448d53ac8cca`.

### B6 — lote funcional: activação de campanhas empresariais pagas por créditos (27/11/2026)
- A compra empresarial por créditos criava a campanha directamente em `ACTIVE`, mesmo quando o início contratado era futuro. O motor de entrega respeitava a data, mas o estado administrativo não.
- F406 mantém o débito atómico e cria a campanha em `ACTIVE` apenas quando o período já começou; caso contrário, mantém `PENDING` para activação administrativa quando a data for atingida. A função recebe também `search_path` catalog-first e mantém execução apenas para utilizadores autenticados.
- O histórico do anunciante passa a distinguir créditos debitados de campanhas ainda a aguardar activação.
- Commits `e7f7d6d1c26e53ee17b8f44791e1fe0a029969f0`, `81feff66a66fd9bde8b141f157a22384e603ea6e` e `f7f3357dff1634aca269036ca144b158e8fed6a2`. Migração não aplicada.

### B6 — lote funcional: bloqueio de activação antecipada de campanhas empresariais (27/11/2026)
- Depois de diferir campanhas empresariais pagas por créditos para `PENDING` quando têm início futuro, a revisão identificou que a RPC administrativa ainda verificava apenas a data final; um operador podia activá-las antes da data contratada.
- F407 exige que `starts_at <= now() < ends_at` para activar campanhas empresariais e devolve um erro específico quando o início ainda não chegou. A Server Action converte esse erro numa mensagem operacional já suportada pelo painel.
- Commits `1c48d34237dedd61f644158725507de13627ff70` e `2444ccaa3bc2cef5e5c565eaeb8026631a0303e8`. Migração não aplicada.

### B6 — lote funcional: transições empresariais disponíveis no painel administrativo (27/11/2026)
- O painel empresarial apresentava todos os estados possíveis independentemente do estado actual, liquidação e período contratado. Isso permitia seleccionar `ACTIVE` antes do pagamento ou antes da data de início, mesmo que a RPC recusasse a transição.
- A fila passou a calcular as transições empresariais apresentadas com base no estado, prova de liquidação, data de início e data final; a consulta inclui agora `credits_charged` para distinguir compras por créditos efectivamente liquidadas.
- Commit `e8ddaeee51899b9229e32cf8fea0f2a9d03016f3`.

### B6 — lote funcional: prevenção de submissões empresariais inelegíveis (27/11/2026)
- O checkout permitia seleccionar mais de 10 critérios de localização/categoria, embora a validação do servidor limite cada grupo a 10; também apresentava o pagamento por créditos como disponível sem comparar o saldo da empresa com o custo segmentado.
- O formulário limita cada grupo a 10 selecções, calcula a disponibilidade de créditos com base no saldo da empresa actualmente seleccionada e apresenta um estado específico quando não existe empresa associada à conta.
- Commit `bbd5306bd51ce2a08aed5291c77b0fdf0d7a3dcf`.

### B6 — consistência de preço em créditos no catálogo empresarial (27/11/2026)
- O catálogo podia apresentar um preço de `0 créditos` quando o campo estava ausente, porque a conversão de `null` para número produz zero. A interface agora distingue preço em créditos configurado de formato sem preço em créditos.
- Commit `70140a567483ce338d8fffab8d06df259824ca69`.

### B6 — melhoria de entrada de datas no checkout empresarial (27/11/2026)
- O campo de início de campanha empresarial passa a impedir no próprio selector a escolha de datas/horas anteriores ao momento local do utilizador, mantendo a validação definitiva no servidor.
- Commit `7e1c381db0f4b4c55dd3f81d978fa130fed903b3`.

### B6 — lote funcional: integridade entre catálogo e inventário publicitário entregue (27/11/2026)
- A revisão transversal das páginas públicas confirmou os pares canónicos de superfície/posição, mas os catálogos empresariais e de parceiros apenas validavam se cada campo pertencia a uma lista geral. Isso permitia vender combinações que nenhuma página pública renderiza.
- F408 introduz constraints de catálogo para pares válidos, valida o par nas RPCs de compra empresarial por créditos/M-Pesa e no pedido de campanha do parceiro, e filtra o catálogo do parceiro para devolver apenas formatos entregáveis.
- O checkout empresarial também deixa de apresentar produtos pagos com combinações de superfície/posição sem destino público.
- Commits `0c78ff7e25af8d264d158b318262ab32e25aacae` e `7d46749e3593a70831bd0041c084368a52b55f63`. Migração não aplicada.

### B6 — lote funcional: protecção de inventário legado não entregável (27/11/2026)
- As constraints de catálogo F408 protegem novas alterações, mas produtos legados inválidos ainda podiam ser apresentados, cobrados ou activados por funções administrativas que consultam directamente o produto/campanha.
- F409 acrescenta guardas nas RPCs de emissão de cobrança e activação de campanhas empresariais e de parceiros; o painel traduz o erro para uma mensagem que identifica a combinação superfície/posição inválida.
- Commits `78d73c7059aac9ec02b8c0d31525024306cbd6fd`, `e51d10354cfd2f4114cf9b80a19fbb6d0c0efb80` e `7806c1cff51eaf9c5c5eabc529d37aed15507efa`. Migração não aplicada.

- A mesma mensagem de inventário não entregável foi ligada também às Server Actions de emissão de cobrança e transição de campanhas de parceiros, evitando que o erro SQL chegue ao operador como erro genérico. Commit `f81b25b6486900a906f308d9a1f1fbd200eef9fb`.

- As guardas F408/F409 foram endurecidas para tratar explicitamente campos de superfície/posição nulos, evitando que a semântica SQL de `NULL` permita passar por uma condição `NOT (...)`. Commits `810b275a66ade5b0ae5d1a0384ee5f8edd0eec46`, `a92980f71d2ddfb6e4ed1505ae7aa88973783d28`, `3b9d2d80e2f1f3f1d0093dfed3bedb65c3f68875`, `51721efae89670c162ec6b28b5e5af3e3ae47ce6`, `4d0889028df8f30682905d86907711ad4c6690c5` e `a92bcd005a2958102761935b732185ec7fd90296`.

### B6 — lote funcional: pares canónicos também no motor de decisão e na medição (27/11/2026)
- F408/F409 impediam novas vendas e activaçōes de inventário inválido, mas o motor de decisão e o escritor atómico de eventos ainda aceitavam qualquer par de valores enumerados se uma campanha legada tivesse a mesma combinação.
- F410 filtra os candidatos do motor de decisão por pares canónicos e rejeita eventos com superfície/posição incompatível. A API de decisão e a validação TypeScript usam a mesma matriz; foi acrescentado um caso de regressão para uma posição conhecida na superfície errada.
- Commits `53db1aa2835b17a9b44892787b36bbb0c266ad67`, `c55ad17970a6fc74ec85e39bd2e86a594b7f62a6`, `1056a852ffd301a80bb34ac097d60aece731d064` e `8269da0a7328f8425c9c724cc667c282edefa5ff`. Migração não aplicada; teste não executado.

### B6 — consolidação da matriz de posições publicitárias (27/11/2026)
- A mesma matriz de superfície/posição estava duplicada no formulário comercial, API de pedidos, API de decisão, validação de eventos e filtro do catálogo empresarial. Foi criada uma definição TypeScript partilhada e os cinco consumidores passaram a reutilizá-la; as migrações SQL mantêm a cópia equivalente necessária no lado da base de dados.
- Commits `17c83f5d113d0174a0e4e37b28b1579e5caaa69b`, `67e842e354757d74d331ba66330a3401465d59ed`, `ee144f13db0b3800952530b1d79cb1ba1b1b3f7d`, `7484ff3c6288d41094905433f42a8bbacec67aad`, `d7d63e15dc04dde32b80dee5f16f706b2e614678`, `2bbcd7b6258973f8eab7164e5ae34352c8c09e7c` e `1296aceb3a977b31f62e72bcff40d189846af07f`.

### B6 — consolidação da lógica de preço no checkout empresarial (27/11/2026)
- O formulário calculava localmente o acréscimo por segmentação, enquanto a biblioteca de validação mantinha uma segunda implementação apenas para MZN. A lógica TypeScript foi consolidada na biblioteca partilhada para preço em MZN e créditos, com a mesma regra de acréscimo e tratamento explícito de preço ausente.
- O checkout passou a reutilizar os dois cálculos e os testes de regressão cobrem a equivalência do factor de segmentação e a indisponibilidade de preço ausente. Os testes não foram executados.
- Commits `155b5195834f776458f72058f2b7719b9037f559`, `00f997fc367bcd5039ee4cc0cd1553d26b0ea58b`, `5d7e9700a8dcb9ef097bdbae5635df970d6eda17`, `9f70d1860df319a7a423e2f0225a6a632a64c46c` e `94c86133f76d143ab1a06eae2c719ff0335d4289`.

### B6 — lote funcional: callbacks M-Pesa atrasados após reemissão (27/11/2026)
- Uma tentativa M-Pesa falhada pode ser reemitida; um callback tardio da referência anterior podia procurar a ordem já reassociada à nova tentativa e devolver erro de ordem inexistente.
- F411 faz os callbacks de confirmação/falha ignorarem explicitamente pagamentos já marcados como `FAILED`, sem alterar a cobrança actual, sem liquidar uma tentativa substituída e sem produzir notificações duplicadas.
- Commit `770ffb62745708c9720d2c590b6cd2f315155e46`. Migração não aplicada.

### B6 — lote operacional: expiração efectiva de transferências bancárias pendentes (27/11/2026)
- A janela de 24 horas já bloqueava a confirmação e permitia reemissão, mas os registos financeiros/documentos podiam permanecer indefinidamente em `PENDING/ISSUED` quando não havia reemissão imediata.
- F412 acrescenta reconciliação automática: marca como `FAILED` as transferências bancárias pendentes cujo `expires_at` terminou, anula documentos ainda `ISSUED`, liberta a ordem de pagamento de parceiro para reemissão e notifica os membros activos da conta. O job de 15 minutos passa a executar a reconciliação conjunta de campanhas e pagamentos.
- As áreas administrativa e do parceiro distinguem a expiração bancária de uma falha M-Pesa genérica.
- Commits `2e214d38cd5effe8dcd4c4321e6e77ab383772ac`, `6f1a2a9371683c6a14b455837a255750cd5e99cb`, `b55b83f1d9ec712405a5ada117d371a2806d1299` e `ec2bba6ccfcadb10fab93221a80e697a789ccb94`. Migração e job não aplicados/confirmados em ambiente.

- A renovação do prazo de um pedido que já estava em `AWAITING_PAYMENT` não alterava o estado e, por isso, não era capturada pelo trigger histórico de transições. A F405 passou também a registar a renovação em `advertising_admin_events`, com actor, razão e estado anterior/novo, sem duplicar eventos de transição normal. Commit `024d2c45c921f24eb2c733db444ec633770ca951`.

### B6 — alinhamento da experiência de compra de créditos com o prazo bancário (27/11/2026)
- Os pedidos de compra de créditos por transferência já eram bloqueados pela RPC depois de 24 horas, mas o painel administrativo continuava a apresentar o botão de aprovação e o cliente via apenas a data limite.
- A área administrativa agora oculta a aprovação depois do prazo e orienta a recusa do pedido expirado para libertar uma nova solicitação; a área da empresa identifica explicitamente o prazo expirado e informa o passo seguinte.
- Commits `4184693b3c35279cc0586c44ff98d0a3aed83fdf` e `9556a328cc752de737cb1a093d885e687ff78b24`.

### B6 — correcção de fuso horário nos pedidos de campanhas de parceiros (27/11/2026)
- O formulário de parceiro interpretava `datetime-local` no fuso configurado no dispositivo, enquanto o servidor e a operação comercial usam Maputo (UTC+02:00). Em dispositivos configurados noutro fuso, o período podia ser deslocado.
- Os formulários empresarial e de parceiro passam a usar uma função comum para apresentar o mínimo no fuso de Maputo; o formulário de parceiro também converte explicitamente os valores locais para ISO no mesmo fuso antes de chamar a RPC.
- Commits `653d3d2a043a027a9cbcecb3c3bdecf50303089d`, `cedc4ffd90fc23160c36ed8db7df65e13201982a`, `c250df21f49d32b80b97ee62dd4da40da79d738d` e `28b036d1c4d463f19208169b696db28e0801f600`. Testes actualizados, não executados.

- O mínimo de data/hora dos campos foi arredondado para o minuto seguinte quando o relógio contém segundos, evitando que a própria opção mínima já esteja no passado no momento da submissão. Commits `8563658894c906162b86dda8542a323a07134e3c` e `496584f3c45b35f732c858353e9b85e9606afbb3`.

- As notificações de liquidação/expiração foram isoladas em blocos de melhor esforço: uma falha no serviço de notificações não pode reverter a confirmação financeira, o callback M-Pesa ou a expiração de uma cobrança. A reconciliação financeira permanece autoritativa e regista aviso operacional se a notificação falhar. Commits `d41157d6790e3a94ed40c4774d9dea8bc3950acf`, `5bd4b8a42a5e0cc7bbfac7bc71180c66a2a0fd47`, `d3adb977955bd7040b5e2500520e68446e148fad` e `9312f251017b0c191f6bba4c069a63b17c82077f`.

### B6 — lote de resiliência: notificações não bloqueiam liquidações nem transições auditadas (27/11/2026)
- A confirmação M-Pesa empresarial e os triggers de estado de campanhas empresariais/parceiros ainda executavam inserções de notificações dentro da transacção principal. Uma indisponibilidade da tabela/serviço de notificações podia reverter a liquidação ou a transição, apesar da evidência e do estado serem válidos.
- F413 e F414 isolam a entrega de notificações em blocos de melhor esforço, mantendo os registos financeiros e os eventos de auditoria como operações transaccionais obrigatórias. Falhas de notificação geram avisos operacionais, mas não revertem pagamentos nem moderação.
- Commits `271386fc516f09bb5c370123bcb44a4e0f959aa8` e `20a47ad6bc403167938946c97f24a84f7050ff6e`. Migrações não aplicadas.

### B6 — consolidação das máquinas de estado administrativas (27/11/2026)
- Os mapas de transição de pedidos, campanhas empresariais e campanhas de parceiros estavam duplicados entre o painel e as Server Actions, com risco de divergência entre opções apresentadas e transições aceites.
- Foi criada uma máquina de estado partilhada para pedidos, campanhas empresariais e campanhas de parceiros; o painel e as Server Actions reutilizam agora os mesmos mapas e regras de elegibilidade. Foi acrescentada cobertura para pagamento, janela contratada e renovação do prazo.
- Commits `a45a9a8e6dd5c1df6d05f7bce89c8146ed7d3f4c`, `915bc4c24cc33d782cbc4633bb71fba8d4927c5e`, `2b7c037b16b5829737c0504d3fb19ef9258540df` e `6b9ea6d86d807d0c9a8106def024f2f983ff6915`. Testes não executados.

### B6 — melhoria operacional: pesquisa de campanhas pelo nome da empresa anunciante (27/11/2026)
- A pesquisa administrativa de campanhas empresariais cobria título, headline, URL e posição, mas não o nome da empresa associada, tornando a localização de campanhas por anunciante incompleta.
- O painel passou a resolver primeiro os IDs de empresas correspondentes ao termo e a incluir esses IDs na mesma expressão OR da fila empresarial, preservando filtros, contagem e paginação. Se a pesquisa de empresas falhar ou ultrapassar o limite de resolução, o painel assinala os dados como incompletos em vez de apresentar um resultado como definitivo.
- Commit `056672bd04681da22c1c4b93f4e8dd0de2f256ed`.

- A mesma pesquisa por empresa foi estendida às campanhas de parceiros através da associação `partner_accounts.business_id`, para que a fila administrativa use o nome da empresa tanto em campanhas empresariais como em campanhas de contas parceiras. Commit `38e28f01c0dcd62c36d2875e12040bbc390565ab`.

- A fila de campanhas de parceiros passou também a resolver o nome da empresa associada à conta parceira, substituindo o rótulo genérico sempre que existe associação empresarial. Falhas nesta consulta são sinalizadas como dados incompletos. Commit `6c6f8da030054810b2b8b00bb808df5018d7b980`.

- O limite de resolução de contas parceiras por empresa passou também a ser contado; quando excedido, a fila assinala explicitamente que a pesquisa não é exaustiva. Commit `e825459dc8dea8648ae0fab51db5f3bcbe1ae0ad`.

- O formulário de parceiro removia a validação de duração com uma tolerância de `0,02` dias (cerca de 29 minutos), enquanto a RPC aplicava o limite exacto do produto. A tolerância foi removida para que a validação cliente e servidor usem o mesmo limite. Commit `e30836177a0ebba3a0c4148a994097fad3d25bbc`.

- A resolução de IDs de empresas/contas na pesquisa administrativa foi limitada a 200 resultados para manter o filtro OR dentro de um tamanho seguro; quando a correspondência ultrapassa esse limite, a fila sinaliza que o resultado é parcial e requer uma pesquisa mais específica. Commit `bb4fdaf1645e76859d7f4fe2b093f8572b6cb532`.

- O indicador de pedidos a aguardar atenção contava apenas os registos carregados na página actual, apesar de o rótulo poder ser interpretado como total da fila. O rótulo passou a declarar explicitamente o âmbito da página. Commit `dd697c9b61b7972d5e37691dc140fdf8be8ed1a0`.

- O contador da fila passou a incluir pedidos de publicidade já pagos que aguardam aprovação e campanhas de parceiros aprovadas mas ainda sem liquidação confirmada, evitando subcontagem das acções pendentes. Commit `3e677917e4bcbb43293f8f34f94da34c26f83df4`.

### B6 — consolidated source-only closure pass (28/11/2026)
- Fixed timestamp parity between public advertising request persistence paths: the direct-Postgres path previously inserted Maputo-normalized `startsAt/endsAt`, while the service-role/PostgREST fallback inserted the raw form values. The fallback now uses the same normalized timestamps, avoiding timezone-dependent drift between backend paths. Commit `a36480abd113957847f250ea5473d2af00365663`.
- Static review reconfirmed: event API has explicit 409 returns for campaign eligibility and click-without-impression; click CTA uses `keepalive:true`; event persistence is atomic through F370; decision impressions use the same RPC; product/surface-slot compatibility is centrally enforced; public request date refinement already treats date-only ends as Maputo end-of-day; expiry reconciliation F376 handles ACTIVE and PAUSED business/partner campaigns; F412 expires pending transfers, voids associated issued documents, fails partner orders, and is wired to the unified 15-minute scheduler migration.
- Do not mark B6 production/operationally closed solely on source review: the scheduler and F376/F412 migrations have not been applied or verified in the target database; payment reconciliation, telemetry behavior, RLS/service-role boundaries, UI journeys and responsive/accessibility behavior remain unproven because tests/builds/E2E/SQL execution/deployments were intentionally not run.
- The source-only pass is documented as implementation evidence, not a test report. B6's operational close gate remains explicit until verification is authorized and completed.

## Final technical verification pass — 28/11/2026

This pass records verification evidence and remaining operational gates. It does not overstate B6 as fully closed.

### Repository and CI evidence
- Final code/test baseline: commit `3cd6cf749279daeaba629f8fd859715fcd664ab4` on `main`.
- GitHub Actions run #2869: all jobs passed.
- `npm audit --audit-level=high`: passed.
- Vitest: 19 test files, 106 tests passed.
- Type check (`tsc --noEmit`): passed.
- ESLint + Stylelint: passed.
- Production build: compiled successfully and completed.
- Isolated PostgreSQL migration-hardening checks: passed (SECURITY DEFINER search_path, marketplace RLS/order/notifications, atomic ad purchase inventory, partner membership/context).
- Added isolated F3.76 advertising-expiry integration verification: passed. It checks expired ACTIVE business campaigns, future business campaigns, active/paused partner campaign expiry, already-ended/expired records and repeat-run idempotency.

### Runtime smoke evidence
- Production deployment `moz-empresas` on commit `3cd6cf7`: READY.
- HTTP GET smoke checks returned 200 for `/`, `/empresas`, `/marketplace`, `/oportunidades` and `/parceiros`.
- GET requests to `/api/ads/decision` and `/api/ads/event` returned 405 Method Not Allowed, as expected for POST-only event/decision endpoints. This verifies routing/method handling, not authenticated campaign delivery or telemetry end-to-end.

### Changes made during the verification intervention
- Added explicit Vitest alias resolution for `@/`.
- Added the missing safe M-Pesa callback-audit error classifier module.
- Corrected campaign-credit rounding to avoid floating-point ceiling drift.
- Aligned partner opportunity management role checks with the tested owner/manager policy.
- Corrected advertising eligibility fixture to include its required canonical surface.
- Fixed TypeScript errors in partner-admin messages, query fallback typing, advertising campaign fallback fields and partner application auxiliary query error shapes.
- Added a dedicated isolated PostgreSQL test fixture for F3.76 expiry reconciliation.

### Operational gates still open
- Target-database application and verification of F3.76/F4.12 reconciliation and the unified scheduler (F3.79/F4.02); CI exercises F3.76 on an isolated disposable database only. Scheduler availability and job registration must be confirmed in the target environment.
- Production payment/credit/M-Pesa ledger reconciliation and end-to-end settlement/refund/idempotency scenarios.
- Production RLS/service-role boundary review and verification against the actual deployed schema/permissions.
- Authenticated E2E journeys for business and partner campaign purchase, settlement, moderation, cancellation/recovery and telemetry attribution.
- Browser-level responsive/accessibility checks on public and authenticated advertising surfaces.

The initial CI pass did not execute production migrations or real-payment actions. Subsequent production changes and evidence are recorded below. B6 remains operationally open until all remaining gates are completed in the target environment.


### Production database intervention — F376/F379 (28/11/2026)

The target Supabase project `MozEmpresas` (project ref `zikjvjzbbfzrelbkaaci`) was inspected and confirmed ACTIVE_HEALTHY. The two previously pending advertising-expiry migrations were reviewed against their source SQL and then applied to the target production database:

- `f376_advertising_campaign_expiry_reconciliation`: installs idempotent SECURITY DEFINER reconciliation for expired business promotions and partner ad campaigns; fixed search_path; EXECUTE revoked from PUBLIC/anon/authenticated and granted only to service_role.
- `f379_schedule_advertising_expiry`: registers a 15-minute pg_cron job when pg_cron is available.

**Runtime verification:** migration history now records both migrations (versions `20261128113911` and `20261128113915`). Cron job `mozempresas-advertising-expiry` is present, active, scheduled `*/15 * * * *`, and executes `select public.reconcile_advertising_campaign_expiry_f376();`. Function privilege checks returned anon=false, authenticated=false, service_role=true. Manual reconciliation invocation completed successfully at `2026-11-28T11:39:30Z`, reporting 0 expired business promotions and 0 ended partner campaigns at that moment. This proves job/function setup and successful reconciliation invocation; it does not prove every advertising/payment journey.

**B6 gate update:** F376/F379 production scheduler gate is now CLOSED. Remaining operational gates: F4.12/unified payment-expiry reconciliation and its scheduler confirmation; production financial/credit/M-Pesa reconciliation and settlement/refund/idempotency; authenticated campaign purchase/settlement/moderation/cancel/recovery and telemetry E2E; and responsive/accessibility browser checks. Do not declare B6 fully closed until these remaining gates have evidence.


### Production intervention — F392/F412 (28/11/2026)

- Located F3.92 and F4.12 migrations in the repository. The initial attempt to apply F3.92 failed atomically before any schema change because its refund-reference initialization contained a malformed `nullif(trim(coalesce(...)))` expression. Corrected the migration source in commit `84fc1062d525c70a0fb7c0579966f283d413e615` to `nullif(trim(coalesce(p_external_refund_reference,'')), '')` and successfully reapplied F3.92.
- Successfully applied F4.12 `reconcile_expired_bank_transfers`, which marks pending bank transfers expired, marks linked partner orders failed, voids payable issued documents, and attempts notification creation. The unified scheduler now runs both F376 advertising expiry and F412 bank-transfer expiry.
- Migration history confirms F392 (`20261128115402`) and F412 (`20261128115406`). Functions `set_bank_transfer_payment_expiry()`, `admin_confirm_partner_bank_transfer(uuid,text)`, `reconcile_bank_transfer_payment_expiry_f412()` and unified `reconcile_advertising_and_bank_transfer_expiry_f412()` are present.
- Scheduler verified active: `mozempresas-advertising-expiry`, every 15 minutes, command `select public.reconcile_advertising_and_bank_transfer_expiry_f412();`.
- Pending bank transfer counts: financial payments 0 (missing expiry 0); pending partner bank-transfer orders 0.
- Manual unified reconciliation succeeded at `2026-11-28T11:54:19Z`: F376 expired promotions 0 and ended partner campaigns 0; F412 expired payments 0, failed orders 0, voided documents 0, notifications 0. This is an operational invocation, not proof of processing a live payment.
- Security privileges verified: both F412 reconciliation functions and expiry trigger function are non-executable by anon/authenticated and executable by service_role.

**Closed gates:** F376/F379 and F392/F412 production schema, confirmation window, and unified expiry scheduler setup/verification.
**Still open:** authenticated admin payment-confirmation tests; controlled CI test for F392/F412 with expired and unexpired synthetic records; bank-transfer issue/reissue/campaign activation/refund E2E; full reconciliation (M-Pesa/credits/documents); telemetry and browser responsive/accessibility review. No synthetic financial data was inserted into production.
