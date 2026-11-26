# B7 — Partner Workspace closure programme (started 26/11/2026)

## Governing product decisions
- One active user per Partner organization; replacement is sequential, administered, reasoned, and audited. No multi-manager invitations or roles.
- Partner account is an institutional entity, not a listed business and not a portfolio of companies.
- The workspace supports opportunities, advertising, Platform Services/entitlements, factual activity indicators, relationship documents and account/access.
- Market Intelligence must not be represented as market-wide analytics without external data sources and methodology. Current indicators are limited to factual account activity.
- No duplicate functionality should be built when existing pages/actions already meet the element; review call sites and preserve the existing implementation.
- Work on `main`; implementation only until B8/B7 implementation scope is complete. Do not run tests, validation or deploy without explicit authorization.

## B7 tasks — 10 cohesive batches
### B7-T01 — Account identity, authorization and workspace shell
1. active partner account lookup; 2. single-active-user invariant; 3. account/profile status; 4. no multi-user manager path; 5. account entry and route protection; 6. workspace navigation; 7. mobile navigation; 8. account/security view; 9. forbidden/error/empty states; 10. route-link and terminology alignment.
**Initial implementation:** Partner overview, Intelligence and Services now suppress activity/catalogue counts when their underlying queries fail, instead of presenting failed queries as zero. Commits: `545e58a`, `2a97687`, `45a4350`. Not validated.
### B7-T02 — Opportunity publishing and lifecycle
1. owned-opportunity list; 2. create; 3. draft; 4. publication; 5. edit guards; 6. close/archive; 7. deadline/expiry; 8. application/candidate view; 9. history; 10. notifications and error recovery.
### B7-T03 — Candidate management and applicant integrity
1. applicant identity; 2. duplicate submission guard; 3. submit/edit state guard; 4. owner isolation; 5. statuses; 6. candidate notification; 7. application history; 8. pagination/limits; 9. failure states; 10. privacy boundaries.
### B7-T04 — Partner advertising
1. product catalogue; 2. eligible slots; 3. request forms; 4. dates; 5. targeting; 6. pricing/credit; 7. payment states; 8. activation/pause/end; 9. delivery analytics; 10. cancellation/refund and history.
### B7-T05 — Platform services and entitlements
1. service catalogue; 2. eligibility; 3. requests; 4. quotes; 5. acceptance; 6. execution; 7. completion/cancellation; 8. entitlement/exclusivity; 9. renewal/expiry; 10. audit and notifications.
### B7-T06 — Factual activity and performance
1. source data per metric; 2. query completeness; 3. published/draft counts; 4. opportunity deadlines; 5. service request states; 6. advertising delivery metrics; 7. entitlement activity; 8. history timeline; 9. errors do not become zeros; 10. explicitly label unavailable market-intelligence features.
### B7-T07 — Partner relationship and documents
1. relationship context; 2. contracts; 3. engagement/action plans; 4. reporting; 5. document vault; 6. document ownership; 7. versioning; 8. access/expiry; 9. delivery evidence; 10. incomplete-data and failure handling.
### B7-T08 — Account and access lifecycle
1. single-user view; 2. owner identity; 3. active status; 4. replacement via admin; 5. revoked access; 6. suspension handling; 7. session revocation; 8. no duplicate account membership; 9. audit trail; 10. recoverability/communication.
### B7-T09 — Workspace UX and accessibility
1. shared shell; 2. navigation dedupe; 3. responsive/mobile; 4. keyboard/focus; 5. screen reader labels; 6. contrast; 7. page hierarchy; 8. loading/empty/error states; 9. consistent PT-MZ terms; 10. stale/unused code removal only after tracing.
### B7-T10 — Cross-module consolidation and implementation readiness
1. shared partner identity helpers; 2. duplicate queries; 3. shared status labels; 4. canonical audit/history; 5. notifications; 6. upload/storage; 7. route/action guards; 8. configuration; 9. docs updated; 10. implementation-only readiness record.
## Initial task state
B7-T01 has begun with three focused implementation fixes above. B7-T02–T10 are queued by dependency, but existing implementations will be reused rather than recreated. This document is an execution ledger, not validation evidence.
