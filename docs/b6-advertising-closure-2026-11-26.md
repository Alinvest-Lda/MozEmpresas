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
