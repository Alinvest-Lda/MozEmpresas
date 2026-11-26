# B8 — Cross-module audit and notification ownership matrix (implementation inventory)

Updated 26/11/2026. This is a source inventory, not a claim that every event has been verified end-to-end. Notification delivery is currently in-app; no delivery SLA or durable external retry service is assumed.

| Domain | Mutations | Audit source | User-facing notification ownership | Admin visibility |
|---|---|---|---|
| Accounts/staff | account state, staff access | account/staff governance audit | users/access surfaces |
| Listings | moderation state | listing lifecycle notification trigger | offers moderation |
| Opportunities | moderation; application submit/status | opportunity/application event triggers | opportunity moderation; owner history |
| Partner ads | campaign lifecycle | partner campaign status events | partner advertising history |
| Business ads | request/promotion status | advertising_admin_events | advertising history |
| Platform Services requests | status/quote | service_request_admin_events + status events | services admin |
| Service orders/payments | checkout, settlement, adjustments | order/payment audit and reconciliation | service reconciliation |
| Support | assignment, status, replies | support_ticket_events | support queue |
| Partner institution | contracts, engagements, documents, reports, entitlements | partner operational immutable history | institutional partner backoffice |
| Notifications | mark-read actions | recipient-scoped notifications | aggregate admin notifications metrics |

## Governance rules
- Each domain owns its transactional state event; avoid a second trigger that emits the same recipient notification.
- In-app notification rows are recipient-scoped and must never be joined into an aggregate admin display that exposes recipient identifiers or message bodies.
- Support message notifications contain no excerpts of private ticket bodies.
- Moderation reasons may be disclosed only to the affected owner where the source action is reasoned; do not expose internal notes or unrelated private data.
- A failed source query must not be rendered as an empty queue, zero count, or complete audit history.
- Payment and campaign activation must depend on verified settlement, not a provider request acknowledgement.
- This matrix requires implementation review and eventual validation. It does not certify delivery, retries, RLS, or complete event coverage.
