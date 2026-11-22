-- F3.17: supporting indexes for financial, service and advertising foreign-key joins.
create index if not exists ad_delivery_events_user_id_idx
  on public.ad_delivery_events (user_id)
  where user_id is not null;

create index if not exists business_promotion_cancellations_actor_user_id_idx
  on public.business_promotion_cancellations (actor_user_id);
create index if not exists business_promotion_cancellations_business_id_idx
  on public.business_promotion_cancellations (business_id);

create index if not exists business_promotions_business_id_idx
  on public.business_promotions (business_id);
create index if not exists business_promotions_listing_id_idx
  on public.business_promotions (listing_id)
  where listing_id is not null;

create index if not exists financial_documents_user_id_idx
  on public.financial_documents (user_id)
  where user_id is not null;

create index if not exists financial_payments_document_id_idx
  on public.financial_payments (document_id)
  where document_id is not null;
create index if not exists financial_payments_user_id_idx
  on public.financial_payments (user_id)
  where user_id is not null;

create index if not exists platform_service_adjustments_actor_user_id_idx
  on public.platform_service_adjustments (actor_user_id);
create index if not exists platform_service_adjustments_business_id_idx
  on public.platform_service_adjustments (business_id);
create index if not exists platform_service_adjustments_original_payment_id_idx
  on public.platform_service_adjustments (original_payment_id)
  where original_payment_id is not null;

create index if not exists platform_service_orders_renewed_from_order_id_idx
  on public.platform_service_orders (renewed_from_order_id)
  where renewed_from_order_id is not null;
create index if not exists platform_service_orders_service_id_idx
  on public.platform_service_orders (service_id);
