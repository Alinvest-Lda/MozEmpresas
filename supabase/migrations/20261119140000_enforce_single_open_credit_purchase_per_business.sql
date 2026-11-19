-- Enforce at most one open credit-purchase request per business.
-- Application pre-checks improve UX but cannot prevent concurrent submissions.
create unique index if not exists credit_purchase_requests_one_open_per_business_uidx
  on public.credit_purchase_requests (business_id)
  where status in ('REQUESTED', 'PAYMENT_PENDING');
