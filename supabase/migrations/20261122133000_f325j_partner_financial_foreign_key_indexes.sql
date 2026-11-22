-- F3.25j: index all new partner financial foreign-key lookup paths.
create index if not exists financial_documents_partner_account_id_idx on public.financial_documents(partner_account_id) where partner_account_id is not null;
create index if not exists financial_payments_partner_account_id_idx on public.financial_payments(partner_account_id) where partner_account_id is not null;
create index if not exists partner_ad_payment_adjustments_account_id_idx on public.partner_ad_payment_adjustments(account_id);
create index if not exists partner_ad_payment_adjustments_campaign_id_idx on public.partner_ad_payment_adjustments(campaign_id);
create index if not exists partner_ad_payment_adjustments_actor_user_id_idx on public.partner_ad_payment_adjustments(actor_user_id);
create index if not exists partner_ad_payment_orders_business_id_idx on public.partner_ad_payment_orders(business_id) where business_id is not null;
create index if not exists partner_ad_payment_orders_created_by_idx on public.partner_ad_payment_orders(created_by);
create index if not exists partner_ad_payment_orders_financial_document_id_idx on public.partner_ad_payment_orders(financial_document_id) where financial_document_id is not null;
create index if not exists partner_ad_payment_orders_financial_payment_id_idx on public.partner_ad_payment_orders(financial_payment_id) where financial_payment_id is not null;
