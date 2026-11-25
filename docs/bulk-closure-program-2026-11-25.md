# MozEmpresas — Bulk Closure Programme (canonical, 25 Nov 2026)

## Governing decisions
Canonical execution order. Work on main; no deployment during implementation. Do not repeat closed interventions or increase closure percentage without evidence.

## Product/business baseline
- MozEmpresas is a Mozambican business discovery directory and digital marketplace for companies, products, services and opportunities.
- Public directory/profile surfaces expose only active and approved public data.
- Marketplace is business-interest/negotiation; buyer/seller payment and delivery remain outside MozEmpresas.
- Platform Services are platform service orders. Credit and M-Pesa paths must remain distinct and require authoritative settlement, idempotency, reconciliation and compensating refunds.
- Partner is a strategic account, separate from business/company profiles. Latest decision: one active user per Partner organization. No multi-manager UX or membership paths; replacement is sequential after documented revocation.
- Partner workspace covers opportunities, partner advertising by request, relationship operations, contracts/documents and factual activity indicators. Do not promise market intelligence without external sources and methodology.
- Super Admin is the platform control plane for moderation, account governance, partner accounts, opportunities, support, service requests, advertising, credits/finance, reconciliation, audit, notifications and system configuration.
- Contests remains removed. Opportunity flows remain required for Partner product.

## Bulk close sequence

### B0 — Repository and database source-of-truth
1. Reconcile migration ledger to SQL files by normalized names, versions and SQL content/hash; classify missing, renamed, duplicate-effect and safe obsolete artifacts. Do not delete/replay production migration history for cosmetic count alignment.
2. Inventory tables, views, policies, triggers, indexes, functions/RPCs, Edge Functions, environment references, Storage, routes, API handlers and actions.
3. Establish canonical ownership for repeated configuration: env names, payment routing, identity/tenant helpers, state machines, event/notification handlers, audit, design tokens and shells.
4. Remove duplicates only after call sites and dependencies prove safe. Where deletion is unsafe, mark deprecated and remove runtime references first.

### B1 — Security and access
Close the access matrix for anonymous, user, business, Partner single-user, platform staff and Super Admin. Review RLS, grants, RPC execute, SECURITY DEFINER/search_path, Storage and API routes. Remove redundant policies/helpers only after tracing dependencies. Reconcile Partner invite/claim/revoke/replacement and audit coverage.

### B2 — Public discovery and identity
Registration/login/confirmation/recovery/session/account status/deletion. Directory, profiles, categories, search/contact. Listing lifecycle, attachments and cleanup. Favorites, saved searches and alerts with filters, opt-out and deduplication. Trace legacy routes before removal.

### B3 — Marketplace
Listing lifecycle and moderation. Buyer interest, seller notification, participant access, allowed transitions, cancellation/completion and history. Keep off-platform payment/delivery clear. Consolidate state, audit and notification ownership.

### B4 — Platform Services
Canonical catalogue/pricing/eligibility. Request/order, quote/approval, execution, completion/cancellation, expiry/renewal. Separate credit and M-Pesa checkouts. Atomic settlement/audit/notifications/refunds/reconciliation. Reconcile service_requests vs platform_service_orders without dropping data.

### B5 — Credits and finance
Wallet/ledger invariants; purchase request/proof/admin decision; M-Pesa callback identity/idempotency/amount/currency/reference validation; audited adjustments and refunds; financial reports and admin UX.

### B6 — Advertising
Canonical product/pricing/slots/capacity/dates/targeting. Business ad request/payment/moderation/delivery/telemetry/billing. Partner ad request/review/payment document/activation only on settlement/pause/end/cancel/refund. Capacity locking, reference integrity, deduped events, sourced analytics. Remove obsolete catalogue paths only after replacement.

### B7 — Partner workspace
Single active user and sequential replacement. Opportunities lifecycle/candidates/status/history/notifications. Define partner services/entitlements/exclusivity terms, scope, validity, renewal, suspension and audit. Contract/document vault. Relationship accountability/performance/action plans. Activity indicators must be factual; intelligence needs real sources.

### B8 — Super Admin
Central RBAC/server guards. Work queue/overview/SLA. User/account/session governance. Company/listing/opportunity moderation. Partner lifecycle. Service/ad/credit/payment backoffice. Atomic support. Canonical audit and reason-required critical actions. Event-recipient-message-link notification matrix.

### B9 — UX/config/legacy
Canonical tokens and shared UI primitives; migrate shells. Remove duplicate/unused CSS/components/navigation/routes only after dependency tracing. Distinguish loading/empty/error/forbidden/retry; eliminate silent errors as empty. PT-MZ vocabulary, mobile, keyboard/focus/accessibility. Consolidate env/config, dependencies and scripts after call-site review.

### B10 — Implementation 100%, then validation
Complete implementation, DB, RPC, UI, permissions, error handling, audit, notifications and docs before tests. After 100%, run integration/RLS/E2E, M-Pesa sandbox, storage, concurrency, accessibility, performance and smoke tests, fix failures and document acceptance. Deploy only after explicit approval. Until then, no tests, smoke tests, final validation or deploy.

## Findings already surfaced (not an exhaustive scan)
- Migration file count and ledger count differ (191 vs 206); exact-name mapping is unreliable because versions/names diverge. No mass cleanup authorized.
- private.partner_access_grants has RLS disabled in Supabase inventory; schema is private but privilege/exposure review is still critical. Do not enable RLS blindly without policy design.
- Notification overlaps already cleaned for service requests and opportunity applications; support notification ownership reconciled. Do not reintroduce duplicates.
- Old Partner multi-manager assumptions conflict with current single-active-user rule; mark superseded and remove runtime paths after dependency tracing.
- Historical CSS audit found repeated global styles, literal colors and !important; broad deletion without selector/call-site trace is unsafe.

## Progress accounting
Keep 89% as the prior provisional baseline until a comprehensive evidence-based recalculation. Count net closure of unique gaps, not migration counts or cleanup alone.