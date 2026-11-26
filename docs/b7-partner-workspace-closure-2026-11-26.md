# B7 — Partner Workspace closure programme (started 26/11/2026)

## Governing product decisions
- One active user per Partner organization; replacement is sequential, administered, reasoned, and audited. No multi-manager invitations or roles.
- Partner account is an institutional entity, not a listed business and not a portfolio of companies.
- The workspace supports opportunities, advertising, Platform Services/entitlements, factual activity indicators, relationship documents and account/access.
- Market Intelligence must not be represented as market-wide analytics without external data sources and methodology. Current indicators are limited to factual account activity.
- No duplicate functionality should be built when existing pages/actions already meet the element; review call sites and preserve the existing implementation.
- Work on main; implementation only until scope is complete. Do not run tests, validation or deploy without explicit authorization.

## B7 tasks — 10 cohesive batches
### B7-T01 — Account identity, authorization and workspace shell
1. active partner account lookup; 2. single-active-user invariant; 3. account/profile status; 4. no multi-user manager path; 5. account entry and route protection; 6. workspace navigation; 7. mobile navigation; 8. account/security view; 9. forbidden/error/empty states; 10. route-link and terminology alignment.
**Implementation status:** identity, account/security, single-user policy and workspace shell already exist. Partner overview, Intelligence and Services now suppress activity/catalogue counts when their underlying queries fail, instead of presenting failed queries as zero. Commits: 545e58a, 2a97687, 45a4350. Not validated.
### B7-T02 — Opportunity publishing and lifecycle
**Additional implementation:** partner edit form now validates expired closing dates for publication, applies the opportunity lifecycle transition map, and uses compare-and-set on current status to reject stale edits. Commit c819b2a. Opportunity listing displays expired deadlines explicitly without changing stored state. Commit 3417b76. Not validated. Owner publication form still writes directly through the client and relies on existing RLS; server-side atomic lifecycle enforcement remains a future closure item.
**Initial implementation: the Partner opportunity list now suppresses publication metrics when its source query fails, and reports lifecycle-history query failure instead of presenting a zero-event history. Commit 2887eb3. Not validated.
1. owned-opportunity list; 2. create; 3. draft; 4. publication; 5. edit guards; 6. close/archive; 7. deadline/expiry; 8. application/candidate view; 9. history; 10. notifications and error recovery.
### B7-T03 — Candidate management and applicant integrity
**Initial implementation:** the candidate-management page now exposes auxiliary-query failures for candidate identities and event history and labels history unavailable rather than presenting a misleading empty event list. Commit 987e3d3. The atomic candidate/opportunity submission guard already exists in the prior B8 tranche. Not validated.
1. applicant identity; 2. duplicate submission guard; 3. submit/edit state guard; 4. owner isolation; 5. statuses; 6. candidate notification; 7. application history; 8. pagination/limits; 9. failure states; 10. privacy boundaries.
### B7-T04 — Partner advertising
**Initial implementation:** the advertising workspace now captures errors for product, campaign, payment, telemetry and lifecycle-event sources; dependent metrics are suppressed when their source failed, and campaign lists are not presented as conclusively empty when key queries are unavailable. Commit 3af4fdf. Not validated. Campaign decision history now shows lifecycle, old/new status, administrative reason and timestamp to the account. Commit 757b918. Ad-request page distinguishes catalogue failure from an empty catalogue. Commit a9c3a79. Not validated.
1. product catalogue; 2. eligible slots; 3. request forms; 4. dates; 5. targeting; 6. pricing/credit; 7. payment states; 8. activation/pause/end; 9. delivery analytics; 10. cancellation/refund and history.
### B7-T05 — Platform services and entitlements
**Additional implementation:** service catalogue, request and entitlement query failures are no longer presented as false empty states. Commit 0a9cc61. Not validated. Existing service request flow and entitlement data are reused; expiry/renewal semantics require business rules before implementation.
1. service catalogue; 2. eligibility; 3. requests; 4. quotes; 5. acceptance; 6. execution; 7. completion/cancellation; 8. entitlement/exclusivity; 9. renewal/expiry; 10. audit and notifications.
### B7-T06 — Factual activity and performance
**Additional implementation:** activity/history total now becomes unavailable when one of its source queries fails, instead of claiming a complete partial count. Commit ebd3bc4. Not validated.
1. source data per metric; 2. query completeness; 3. published/draft counts; 4. opportunity deadlines; 5. service request states; 6. advertising delivery metrics; 7. entitlement activity; 8. history timeline; 9. errors do not become zeros; 10. explicitly label unavailable market-intelligence features.
### B7-T07 — Partner relationship and documents
1. relationship context; 2. contracts; 3. engagement/action plans; 4. reporting; 5. document vault; 6. document ownership; 7. versioning; 8. access/expiry; 9. delivery evidence; 10. incomplete-data and failure handling.
### B7-T08 — Account and access lifecycle
1. single-user view; 2. owner identity; 3. active status; 4. replacement via admin; 5. revoked access; 6. suspension handling; 7. session revocation; 8. no duplicate account membership; 9. audit trail; 10. recoverability/communication.
### B7-T09 — Workspace UX and accessibility
**Additional implementation:** shared partner workspace header marks its decorative status icon as hidden from assistive technology and labels the brand container. Commit 0bc4509. Redirect-only legacy partner routes were identified (`empresas`, `indicacoes`, `radar`, `rede`) and retained rather than removed. Duplicate Account and access footer links were removed from desktop/mobile navigation because the same route already exists in the primary navigation. Commits 8eb91a8 and 22130cb. Not validated.
1. shared shell; 2. navigation dedupe; 3. responsive/mobile; 4. keyboard/focus; 5. screen reader labels; 6. contrast; 7. page hierarchy; 8. loading/empty/error states; 9. consistent PT-MZ terms; 10. stale/unused code removal only after tracing.
### B7-T10 — Cross-module consolidation and implementation readiness
1. shared partner identity helpers; 2. duplicate queries; 3. shared status labels; 4. canonical audit/history; 5. notifications; 6. upload/storage; 7. route/action guards; 8. configuration; 9. docs updated; 10. implementation-only readiness record.

## Initial task state
B7-T01 has begun with three focused implementation fixes above. B7-T02–T10 are queued by dependency, but existing implementations will be reused rather than recreated. This document is an execution ledger, not validation evidence.

### B7-T07 investigation — document access boundary (implementation checkpoint)
**Traced existing vault:** the institutional document vault is private and restricted to Super Admin in both `partner_documents` row-level policies and `partner-documents` storage-object read policies. The upload trigger verifies the account-prefixed storage path, object existence, document-parent/account ownership, and immutable version sequencing. This is an intentional security boundary; no direct partner SELECT/storage policy or client-side signed-link path was added.

**Closure gap:** partner-facing document retrieval is not yet implemented. Next implementation must use a server-side account/user authorization check (active partner account, portal enabled, exactly-one authorized user/member association), retrieve only that account's metadata, issue short-lived signed download URLs after authorization, and audit access. Before coding, trace the canonical membership/auth schema and existing secure server-action/storage helpers; do not broaden vault RLS or expose raw storage paths. Check access-expiry/revocation behavior and failure states. This checkpoint is investigation only; no tests or migration execution.


### B7-T07 — partner-facing document access implementation (partial closure)
Implemented the initial partner document workspace at `/parceiro/documentos`, added it to the shared partner navigation, and created server-only actions in `lib/partner/documents.ts`.
- The page is gated by `requirePartnerAccount()`, which resolves the authenticated active partner owner.
- Privileged service-role reads are kept server-side; the partner account is rechecked against the canonical `partner_accounts` row for ACTIVE status and `portal_enabled=true`.
- Document metadata is scoped to that account only and capped to the newest 100 entries.
- Downloads require a valid UUID, re-check the canonical account status and portal flag, query the document by both ID and account ID, then issue a 120-second signed URL from the private bucket. Raw storage paths are never returned to the browser.
- The UI surfaces loading/download errors and filename, type, version, size, and upload date.
Commits: `f321426` (server actions), `fbab066` (page), `4297e1b` (list component), `f5ff1a5` (canonical account status check), `e3e2d52` (navigation).
**Remaining T07 gaps:** access-download audit event, explicit document grouping/parent context and history UX, partner-side access expiry display, further consistency checks. This is partial implementation, not closure; no validation/test run.


### B7-T08 — account/access lifecycle trace checkpoint
Traced the existing one-user partner access lifecycle: the active membership/owner is verified in `requirePartnerAccount`; access claims bind an invitee identity, account status, portal-enabled state and single-active-member invariant; admin revocation is reasoned, transactional, audited in `partner_relationship_audit`, and emits a partner notification. Existing code and migrations include `admin_partner_access_members_list`, `admin_partner_access_revoke`, `partner_access_claim`, and notification governance. This is reused rather than duplicated.
**Remaining T08 gaps:** session revocation behavior should be explicitly documented/confirmed; restore/replacement pathway and recovery communications need a single coherent evidence trail; ensure suspended account and revoked member are consistently rejected across all portal/server actions. No runtime or security verification performed.


### B7-T10 — consolidation trace checkpoint
The partner workspace navigation is shared from `partnerNavGroups` across desktop sidebar and mobile menu; the institutional documents route was added to this canonical navigation rather than duplicating menu definitions. Existing redirect-only routes were retained pending call-site/reference confirmation, avoiding destructive removal. The documents page/actions are isolated into `app/parceiro/documentos/page.tsx`, `components/partner-documents-list.tsx`, and server-only `lib/partner/documents.ts`.
**Remaining T10:** deeper duplicate-query/status-helper consolidation requires a cross-page call-site review; no tests/validation were run. No cleanup was claimed beyond changes specifically reviewed.


### Additional B7 refinements
- T07: document-vault entry surfaced from the partner overview value stack (commit `17a8ee1`).
- T09: mobile partner navigation panel now declares dialog semantics and is inert/hidden from accessibility interaction when closed (commit `3b70516`). This is a code-level improvement, not accessibility validation.


### B7-T07 additional refinement — contextual document grouping
- Partner document list now groups files by their parent context (organization, engagement, contract, campaign, service request, or generic) instead of presenting one undifferentiated list. Document size/date rendering now handles malformed metadata safely, and download buttons expose pending state to assistive technology. Commit `ee2cf4c`.
- Still not closed: download audit evidence, actual parent-context values/schema consistency, version history UX, expiry/revocation visibility and validation.

### Additional B7-T02 implementation refinements
- Repaired three literal escaped-newline sequences in the partner opportunity editor source that interrupted normal TypeScript/JSX source layout. Commit `15fb25b`.
- The opportunity editor now catches thrown network/runtime failures during session, account, read, update or insert operations and always clears its pending state; it tells the user that the write was not confirmed and asks them to review before retrying. Commit `4448c4b`.
- These changes improve source integrity and recovery but do not close T02: atomic server-side lifecycle enforcement, notifications, and remaining lifecycle elements are still open. No tests, CI, SQL execution, E2E, accessibility audit or deployment were performed.

- T02: the server action for publishing/reopening an opportunity now reloads its opening and closing dates and rejects a transition to PUBLISHED when the opening is still in the future or the closing deadline has passed; the workspace explains the date-specific rejection. This protects status changes even when the action is submitted outside the editor. Commits `64e1aee`, `eb4e7fb`.
- T02 remains open: the status compare-and-set is still a client-side Supabase update with RLS, not a dedicated transactional server-side lifecycle RPC; notifications and the remaining task elements are not fully closed. No tests or validation were run.

- T03/T09: the partner opportunity applications page now defines and aggregates the auxiliary business/profile/event query errors before rendering its partial-data warning. This repairs an undefined reference in the page and makes the warning derive from the actual auxiliary query outcomes. Commit `3afdd1f`. No tests or build validation were run.
