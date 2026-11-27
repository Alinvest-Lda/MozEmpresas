-- F3.86: enforce catalogue invariants for future paid inventory writes without blocking legacy rows during rollout.
alter table public.ad_products
  drop constraint if exists ad_products_paid_price_positive;
alter table public.ad_products
  add constraint ad_products_paid_price_positive
  check (not active or access_type<>'PAID' or direct_price_mzn>0) not valid;

alter table public.ad_products
  drop constraint if exists ad_products_paid_slot_required;
alter table public.ad_products
  add constraint ad_products_paid_slot_required
  check (not active or access_type<>'PAID' or (slot is not null and slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT'))) not valid;

alter table public.business_promotions
  drop constraint if exists business_promotions_product_inventory_contract;
alter table public.business_promotions
  add constraint business_promotions_product_inventory_contract
  check (
    status not in ('PENDING','ACTIVE','PAUSED')
    or ad_product_id is null
    or (
      placement is not null and placement in ('DIRECTORY','MARKETPLACE','HOME','OPPORTUNITIES')
      and slot is not null and slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT')
    )
  ) not valid;

alter table public.partner_ad_products
  drop constraint if exists partner_ad_products_public_inventory_contract;
alter table public.partner_ad_products
  add constraint partner_ad_products_public_inventory_contract
  check (
    not active
    or (
      surface is not null and surface in ('HOME','DIRECTORY','MARKETPLACE','OPPORTUNITIES','PARTNER_INTELLIGENCE')
      and slot is not null and slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT')
    )
  ) not valid;

alter table public.partner_ad_campaigns
  drop constraint if exists partner_ad_campaigns_inventory_contract;
alter table public.partner_ad_campaigns
  add constraint partner_ad_campaigns_inventory_contract
  check (
    status not in ('REQUESTED','PENDING','UNDER_REVIEW','APPROVED','ACTIVE','PAUSED','RUNNING','PUBLISHED')
    or (
      surface is not null and surface in ('HOME','DIRECTORY','MARKETPLACE','OPPORTUNITIES','PARTNER_INTELLIGENCE')
      and slot is not null and slot in ('HERO','BILLBOARD','EXCLUSIVE','FEATURED','INFEED','CONTEXT')
    )
  ) not valid;
