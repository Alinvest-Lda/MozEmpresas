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
