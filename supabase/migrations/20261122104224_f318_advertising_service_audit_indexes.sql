-- F3.18: close remaining hot-path indexes for paid advertising and service audit trails.
create index if not exists advertising_requests_business_id_idx
  on public.advertising_requests (business_id);

create index if not exists partner_ad_campaigns_product_id_idx
  on public.partner_ad_campaigns (product_id);

create index if not exists platform_service_order_events_actor_user_id_idx
  on public.platform_service_order_events (actor_user_id)
  where actor_user_id is not null;
create index if not exists platform_service_order_events_business_id_idx
  on public.platform_service_order_events (business_id)
  where business_id is not null;

create index if not exists platform_service_subscriptions_current_order_id_idx
  on public.platform_service_subscriptions (current_order_id)
  where current_order_id is not null;
create index if not exists platform_service_subscriptions_service_id_idx
  on public.platform_service_subscriptions (service_id);

create index if not exists credit_purchase_decision_events_actor_user_id_idx
  on public.credit_purchase_decision_events (actor_user_id);
create index if not exists credit_wallet_adjustment_events_business_id_idx
  on public.credit_wallet_adjustment_events (business_id);
