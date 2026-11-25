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

#### B8 execution in bulk tasks (10 elements each)
Tasks are executed as cohesive batches; individual micro-interventions are not reported as separate progress. Do not close a task until all ten elements are implemented (not tested) and documented.

**B8-T01 — Financial and monetisation control plane (10/10 elements):**
1. Plans/subscriptions query integrity; 2. business-ad product catalogue; 3. partner-ad catalogue; 4. campaign/promotions visibility; 5. impression/click metrics; 6. financial overview RPC failure states; 7. cross-module reconciliation RPC failure states; 8. integrity audit F3.28 failure/sample states; 9. resolution queue F3.29 action/history states; 10. M-Pesa sandbox safety, single-attempt handling and distinction between gateway acceptance and settlement.
- **Task implementation status: 10/10 elements addressed in the Admin financial control surface (implementation-only; not runtime-verified).**
  1. Plans/subscriptions: query error states and active-plan count not fabricated on failure.
  2. Business-ad catalogue: query errors handled and catalogue distinguishes unavailable from empty.
  3. Partner-ad catalogue: same error/empty separation.
  4. Promotions: list-query error state handled.
  5. Delivery telemetry: impressions/click query failures tracked.
  6. Financial overview: RPC error state; missing optional fields display unknown instead of zero.
  7. F3.27 reconciliation: dedicated error/availability state.
  8. F3.28 audit: error state, sample limit, issue severity/detail rendering.
  9. F3.29 queue: status, assignment, notes, evidence, history; strict API payload types/trim/limits; RESOLVED requires note+evidence and IGNORED requires reason; successful action refreshes history and server-rendered state.
  10. M-Pesa sandbox: explicit sandbox/test recipient/amount/shortcode/gateway, one-shot attempt guard, pre-check prior attempt, no retries after ambiguous result, query-state action, and explicit warning gateway acceptance is not settlement.
- Batch commits: `04777a4` finance missing-value handling; `31ff138` strict financial-audit mutation validation; `6af2ec1` refresh/history after save.
- No tests, validation or deployment performed (per closure directive).

**B8-T02 — Partner backoffice operations (10/10):**
1. partner create/update/status; 2. contacts and primary-contact consistency; 3. contracts and transition rules; 4. engagements, assignment and status; 5. invoice creation/link validation; 6. bank transfer registration/duplicate reference; 7. transfer verification and overpayment guard; 8. campaign capacity/date/price integrity; 9. report delivery/email confirmation; 10. document upload/version/access and association integrity.
- **Task implementation status: 10/10 addressed in the backoffice actions (implementation-only; not runtime-verified).** Added strict calendar-date validation for contract periods; start/end ordering; finite bounded engagement amounts and local datetime validation; report period format/date-order checks; entitlement date parsing; campaign datetime format/order checks; active-partner guard before new contract, engagement, invoice, bank transfer, contact, report, campaign, entitlement or document operations; document parent ownership validation against partner account; document upload rollback when registration fails remains in place; campaign price/capacity/date invariants continue to be delegated to the database RPC as authoritative.
- Batch commits: `f1dbc24` contract/engagement/report/entitlement date validations; `5f1f242` campaign date window and document-parent ownership; `dceb05e` active-partner account guard.
- No tests, validation or deployment performed (per closure directive).

**B8-T03 — User, staff and access administration (10/10):**
1. user list/query states; 2. staff listing and role source; 3. activation/deactivation; 4. suspension/ban; 5. account recovery controls; 6. session/security actions; 7. staff removal/revocation; 8. owner/super-admin escalation protections; 9. audit and reason coverage; 10. revalidation of access after mutation.
- **Task implementation status: 10/10 addressed (implementation-only; not runtime-verified).**
  - User directory supports bounded search, type/status/access/association filters, pagination and explicit query-error handling.
  - Account activation, suspension and deletion-request review use the authoritative governance RPC; changes require a reason, prevent self-change and protect the last active Super Admin.
  - Password recovery uses the privileged email lookup and records the recovery event; account status changes revoke refresh sessions.
  - Staff directory has a Super Admin-only RPC exposing active and inactive staff for both revocation and restoration; role escalation is not offered by this surface.
  - Staff access changes use a dedicated RPC with row locking, compare-and-set semantics, self-revocation protection, last-Super-Admin protection, session revocation, immutable audit and required reason.
  - User/staff pages and dependent admin surfaces are revalidated after staff access changes.
- Commits: `cff1c9c` account audit failure state; `f302bd8` audited staff activation/revocation RPC; `c1b5710` staff server action; `2dce8b6` full active/inactive staff directory RPC; `7dfb8fe` staff governance UI/history; `320c2b6` inactive staff restoration visibility.
- No tests, validation or deployment performed (per closure directive).

**B8-T04 — Moderation and discovery governance (10/10):**
- Implementation evidence added: listing moderation now uses a Super Admin-only database RPC with row locking, an authoritative lifecycle map and mandatory 8–500 character reason. Immutable events capture actor, before/after status and reason; the Admin offer page exposes the decision history. Opportunity moderation now follows the same pattern: a Super Admin-only row-locked RPC independently enforces the lifecycle map, requires a reason, and writes actor/before/after/reason atomically to the immutable event history; the Admin opportunity surface captures and displays that reason. Owner notifications remain tied to committed listing status changes; deadline expiry is covered by the existing scheduled close migration.
- Commits: `28587dd` (listing lifecycle guard), `1aa1d61` (transition validation), `55ba647` (immutable listing history), `c7747ba` (owner notification), `5586339` (listing reason RPC), `d9e3669` (listing action RPC), `22fa009` (listing reason input), `d855c76` (listing history UI), `d3994be` (opportunity reason RPC), `5e83cd9` (opportunity action RPC), `5ae3f44` (opportunity reason/history UI).
- Task remains open; company/profile moderation reason coverage, duplicate/invalid submission handling and media/report operations still require implementation.

1. company moderation; 2. profile state; 3. listing moderation; 4. listing lifecycle transitions; 5. opportunity moderation; 6. deadline/expiry controls; 7. duplicate/invalid submissions; 8. media/report handling; 9. status/audit history; 10. notifications tied to approved actions.

**B8-T05 — Platform Services operations (10/10):**
- Implementation evidence: service request quote/status changes now go through a Super Admin-only row-locked RPC, preserve lifecycle transitions, and require an 8–500 character reason. Each administrative decision records actor, before/after status and before/after quote in a separate read-restricted audit table; the Admin centre displays the reasoned history. The existing status-event trigger continues to write requester history and notifications atomically. A Super Admin read policy exposes requester status history to the control plane, while business membership history visibility is restricted to management roles.
- Commits: `879e06c` (Super Admin service-request history visibility), `63fbac4` (reasoned quote/status RPC and audit table), `c4657f9` (server action uses RPC), `110dc4e` (Admin decision history/reason UI); earlier lifecycle/atomic history remains in migrations `20261124180000_f372...` and `20261124220337...`.
- Task remains open pending quote acceptance/execution lifecycle completion, payment-boundary, cancellation/expiry and safe retry closure.
1. service request queue; 2. request status guard; 3. quote/price; 4. acceptance; 5. assignment/execution; 6. completion; 7. cancellation/expiry; 8. credit-payment boundary; 9. M-Pesa-payment boundary; 10. atomic/audit/notification and retry behavior.

**B8-T06 — Advertising operations (10/10):**
- Implementation evidence added: business promotion and advertising request updates load the authoritative current state, enforce allowed transition maps and compare-and-set against the prior state. Promotion activation additionally requires evidence of credit debit or M-Pesa settlement (`paid_at`); partner campaign transitions remain delegated to the database transition RPC, including settlement/date constraints. Draft promotion transition was aligned with the persisted lifecycle.
- Commits: `0190d52` (request/promotion transition guards), `6f03fc8` and `0a25ed9`/`19e7109` (settlement gate and status/type alignment).
- Task remains open; capacity, billing, telemetry, payment/refund and complete notification/audit coverage remain to be closed.

1. business campaign intake; 2. partner campaign intake; 3. product/slot eligibility; 4. capacity; 5. date bounds; 6. moderation/review; 7. payment/credit settlement; 8. activation/pause/end; 9. telemetry/billing; 10. refund/cancel and audit/notification paths.

**B8-T07 — Support and service accountability (10/10):**
- Implementation evidence added: Super Admin support assignment sources eligible staff from the secured `admin_list_platform_staff()` RPC; the database independently rejects inactive/non-Super-Admin assignees. Assignment and status mutations now pass through Super Admin-only RPCs, require an 8–500 character reason, lock the ticket row and write the reason atomically into immutable operational history. The status RPC independently enforces the lifecycle map. The duplicated queue error branch was removed; dependent-query failures are surfaced rather than silently presented as complete metrics.
- The queue now uses exact-count pagination (50 records per page), retains active filters between pages and presents the true total separately from the page count. The admin action layer no longer relies on its former client-side status-transition check; the database RPC is authoritative.
- Commits: `c2dd65b` (secured staff lookup), `709fe20` (single accessible queue error state), `9c950ec` (database assignment guard), `7f885ac` (reasoned mutation RPCs), `6f21d4e` (server actions use RPCs), `5bf799e` (reason capture/display), `abe6fe3` (queue pagination), `fb4aba8` (responsive pagination), `6f637e8` (remove obsolete transition import).
- Task remains open; defined SLA policy and delivery/retry visibility require further closure.

1. ticket queue; 2. auxiliary profile/company lookup; 3. message thread; 4. event timeline; 5. assignment; 6. status transition; 7. response/resolution note; 8. SLA/ageing; 9. notifications; 10. incomplete-data/error state and safe retry.

**B8-T08 — Audit, finance action reasons and notification governance (10/10):**
- Implementation evidence: account governance uses immutable account audit records, reason-required administrative status changes, actor/target attribution, previous/next status, and a protected last-active-Super-Admin rule. Account and Partner-access revocation flows also preserve reasoned audit history. Canonical account audit notification wiring exists in the 25 Nov migration set. Listing moderation now also records immutable actor/before/after status events; this closes listing event integrity but does not yet provide an administrator reason field.
- Support assignment and status changes now capture mandatory reason, actor and before/after values in the operational event log via transaction-local context, atomically with the mutation. Listing moderation also records mandatory reason and immutable actor/before/after status events, exposed in the Admin moderation history. These are module-specific audit closures, not yet a canonical cross-module writer/event matrix.
- Task remains open pending canonical cross-module writer/event matrix, broader recipient/link privacy review, deduplication, delivery failure/retry and complete review surface.
1. canonical audit writer inventory; 2. critical-action reason; 3. actor attribution; 4. before/after state; 5. event integrity; 6. recipient matrix; 7. message/link privacy; 8. dedupe; 9. failed delivery/retry visibility; 10. history and admin review surfaces.

**B8-T09 — Configuration and security control surfaces (10/10):**
- Implementation evidence: the Super Admin route has a server-side fail-closed gate; sensitive account and staff directory RPCs enforce Super Admin identity and restrict execution grants; secrets are not rendered by these surfaces. Payment and Partner access controls remain separately governed by dedicated RPCs.
- Task remains open pending environment/config inventory, route/action consistency, rate limits, storage controls, configuration audit and removal/labeling of unsafe controls.
1. environment/secret state (without exposing secrets); 2. payment configuration; 3. feature/catalog settings; 4. role/RBAC source; 5. route/action guard consistency; 6. rate-limit settings; 7. storage access governance; 8. system-level error reporting; 9. auditability of configuration changes; 10. remove or clearly label unsafe/unimplemented controls.

**B8-T10 — Admin UX and consolidation (10/10):**
- Implementation evidence added: removed a confirmed duplicate block of `.operations` and `.table` CSS rules from the Super Admin users module; removed a duplicated support queue error branch. Loading and error segment boundaries already provide shared loading, retry and error fallback states.
- Commits: `eda0f52` (remove duplicate admin users layout rules), `709fe20` (remove duplicate support error branch).
- Task remains open pending broader duplicate navigation/style/code tracing and remaining accessibility/mobile consolidation.

1. loading states; 2. true-empty states; 3. error states; 4. retry paths; 5. forbidden states; 6. consistent Portuguese-MZ terms; 7. mobile layout; 8. keyboard/focus; 9. duplicate admin entry points/navigation; 10. stale/unused admin code removal after dependency tracing.

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

### B8 — Advertising and company governance error-integrity tranche
- Advertising Admin now captures failures from campaign/request queries, event counters, partner catalogue and partner campaign history. When any query fails, derived counts and CTR are suppressed, a warning explains possible partial lists, and an empty-filter state is not shown as conclusive.
- Company governance now explicitly surfaces failure in the active-owner lookup; company data may still be present, but owner names/emails are marked as potentially unavailable rather than silently blank.
- Commits: `f539ebf` (advertising metrics/query error handling); `17a4123` (company owner lookup warning).

### B8 — Opportunity lifecycle history error visibility
- The Super Admin opportunity list now explicitly captures failures in the lifecycle-event history query and warns that the opportunity list may still render while the event history is unavailable.
- Commit: `06b0a6d`.


### B8 — Monetização: métricas de inventário e consultas parciais (25/11)
- A central de monetização deixa de exibir zero ou totais parciais como se fossem completos quando falham consultas de planos, promoções ou inventário de anúncios.
- Totais dependentes de consultas com erro agora mostram indisponível (—), com rótulos indicando catálogo/consulta incompleta; o aviso global de consultas falhadas permanece.
- Commit: `1e9478c`.
- Sem testes, validação final ou deploy.

### B8 — Reconciliação institucional: erro RPC não equivale a zero (25/11)
- A página de reconciliação institucional de parceiros agora oculta os totais de verificação quando o RPC falha e mostra a contagem por tipo como indisponível, em vez de renderizar zeros/contagens vazias.
- Commit: `8d73f80`.
- Sem testes, validação final ou deploy.

### B8 — Controlo institucional: falha na fila de acções (25/11)
- A página de controlo/continuidade de parceiros agora distingue a falha de consulta da lista de acções de relacionamento de uma fila realmente vazia e apresenta aviso de indisponibilidade; também alerta quando a lista de utilizadores internos não carrega, evitando campos de responsáveis interpretados como definitivos.
- Commit: `b44722c`.
- Sem testes, validação final ou deploy.

### B8 — Controlo institucional: erro da consulta de staff (25/11)
- A consulta de staff interno agora captura explicitamente o erro RPC e mostra aviso de indisponibilidade/incompletude na selecção de responsáveis, em vez de tratar o retorno nulo como lista vazia.
- Commit: `768b34c`.
- Sem testes, validação final ou deploy.

### B8 — Backoffice institucional: consultas auxiliares parciais (25/11)
- Gestão institucional agora captura erros das consultas auxiliares (contratos, execuções, pagamentos, documentos, contactos, relatórios, resumos financeiros, catálogo de publicidade, campanhas, staff, auditorias, documentos, eventos e benefícios) e exibe aviso global quando o conjunto está incompleto.
- Commits: `0b7663e` (captura de erros), `6881a22` (aviso visível no backoffice).
- Sem testes, validação final ou deploy.
