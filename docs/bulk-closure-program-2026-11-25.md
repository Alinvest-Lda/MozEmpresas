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

## E2E sweep — configuration, obsolete paths and product alignment (25/11/2026)

### Removed now-obsolete runtime code
- Removed the legacy custom M-Pesa HMAC webhook route, helper and test. The route expected custom headers/payload not established by the supplied Vodacom callback documentation and was not a valid provider listener.
- Removed the unused MPESA_MERCHANT_CODE example variable and its legacy explanation; current Open API routing uses MPESA_SERVICE_PROVIDER_CODE. M-Pesa remains sandbox-only.
- Partner account UI no longer queries/lists group managers or offers the placeholder for adding them. It shows the organization and current single authorized user instead.
- Partner opportunity authorization now accepts only owner; manager is no longer an active authorization path.

### Configuration/duplication findings
- The Next server client and isolated Deno Sandbox Edge Function have separate RSA/request transport implementations because they execute in different runtimes. This is retained intentional duplication for now, not a cleanup target until a runtime-compatible shared module can be introduced safely.
- The old /publicar-oportunidade route is a redirect to Contacts and is retained as a compatibility redirect, not active publishing functionality; deleting it would remove old-link handling.
- Migration ledger has 206 entries while repository has 191 SQL migration files. Exact name/version comparison shows divergence, but the set includes renamed/rebased historical migrations. Do not delete SQL files, reset ledger, or replay migrations. A content-and-effect reconciliation is still required.
- Supabase inventory reports private.partner_access_grants with RLS disabled, but read-only privilege checks show anon and authenticated have no USAGE on schema private and no SELECT/INSERT/UPDATE/DELETE table grants. This corrects the generic advisor exposure warning: direct API exposure was not found through those roles. Review remains a defense-in-depth item; do not enable RLS without a policy plan.
- Current trigger inventory shows several event, guard, notification and audit triggers on the same tables. Coexistence is not proof of duplication; keep guards/audit/history/notification functions distinct unless their effect is proven redundant.

### Product/business alignment actions
- Current single-user-per-Partner rule supersedes multi-manager assumptions. The Partner product document and implementation status were updated; old role labels are not a feature to re-enable.
- Partner Intelligence must be limited to factual activity indicators until external sources, methodology and privacy-safe aggregation exist.
- Marketplace remains interest/negotiation only; payment and delivery are external.
- Contests remain removed. Partner opportunities remain active product functionality.

### Work not yet safe to delete
Migration SQL/ledger history, old account roles stored in historical rows, financial callback audit tables/RPCs, and compatibility redirects remain until dependency, data-retention and operational-use tracing is complete. No broad deletion was performed.

## B8 — Super Admin intervention tranche (25/11/2026)

### Implemented
- The central Super Admin overview now captures query errors for its operational queue and alert counters instead of silently treating failed count queries as zero.
- If any of the overview's operational queries fail, the page displays a warning and suppresses the affected dashboard numbers as unavailable.
- The service-request list now distinguishes a failed query from a genuinely empty queue, avoiding a false “no requests” state.
- Executive analytics totals now render unavailable when their underlying count query fails; daily activity chart is suppressed if any of its four source queries fail rather than displaying an all-zero chart.

### Commits
- `ce3d0e3` — hide failed operational dashboard metrics instead of false zeros.
- `e115794` — distinguish service-request query errors from an empty queue.
- `7680ea9` — prevent analytics failures from appearing as zero totals or activity.

### Still open within B8
- Full Super Admin route/action inventory and review across all administrative modules is not complete.
- Confirm error-state handling for all admin subpages and mutation actions, including partner institutional backoffice, financial reconciliation, advertising, opportunities, support, users, and business governance.
- Review global audit coverage and required reasons for critical administrative actions; verify notification ownership and event-recipient matrix.
- Reconcile Admin navigation against the actual route set and product contract, including notification governance/system configuration.
- No tests, smoke checks, deployment, or final validation were run, in accordance with the implementation-only closure instruction.

### Additional B8 implementation
- Added a read-only, aggregate Super Admin Notifications page at `/dashboard/admin/notificacoes`; it reports volume, unread backlog, type distribution and daily volume without exposing recipient identifiers or notification bodies. Metrics use the server-only admin client and are unavailable if that client cannot be created; queries show an error state rather than zero.
- Added direct navigation links for Partner institutional management, execution control and reconciliation, and for the Notifications page, reducing the need to discover those routes through cross-links.
- Commits: `46463db` (notifications page), `7720229` (navigation), `d72a0c7` (Partner route links in navigation).

### B8 — Support queue error integrity (additional intervention)
- Central Support now captures query failures for company/profile lookup, ticket events, internal staff lookup, staff profiles and message threads. If any auxiliary query fails, a warning is shown and all queue metrics are suppressed to avoid implying complete/accurate counts.
- The main ticket query still distinguishes query failure from a genuinely empty queue.
- Commit: `48a4494` — report incomplete support data instead of false queue metrics.
- Remaining nuance: if auxiliary queries fail, ticket rows may still render, but related names/conversation/event detail can be incomplete. The warning is visible; B8 remains open until all admin surfaces/actions are reviewed.
