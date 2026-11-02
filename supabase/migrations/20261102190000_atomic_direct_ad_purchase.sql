-- Serialize all business-promotion inventory reservations per product.
-- This migration is repository-only until separately reviewed and approved for production.
create or replace function public.request_promotion_with_mpesa(
  p_business_id uuid,
  p_ad_product_id uuid,
  p_listing_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_locations text[] default '{}',
  p_categories text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_product public.ad_products;
  v_end timestamptz;
  v_promotion uuid;
  v_factor numeric := 1;
  v_price numeric;
  v_locations text[] := coalesce(p_locations, '{}');
  v_categories text[] := coalesce(p_categories, '{}');
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.archived_at is null
      and b.owner_id = v_user
  ) and not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = v_user
      and bm.role in ('owner', 'admin', 'operator')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_starts_at is null or p_starts_at < now() then
    raise exception 'INVALID_CAMPAIGN_DATES';
  end if;
  if length(trim(coalesce(p_title, ''))) > 160 then
    raise exception 'INVALID_CAMPAIGN_TITLE';
  end if;
  if cardinality(v_locations) > 10 or cardinality(v_categories) > 10
     or exists (select 1 from unnest(v_locations || v_categories) x where length(trim(x)) = 0 or length(trim(x)) > 120) then
    raise exception 'INVALID_CAMPAIGN_TARGETS';
  end if;

  -- FOR UPDATE serializes paid and credit-backed reservations for this product.
  select * into v_product
  from public.ad_products
  where id = p_ad_product_id and active = true
  for update;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  if p_listing_id is not null and not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.business_id = p_business_id and l.status = 'PUBLISHED'
  ) then
    raise exception 'LISTING_NOT_AVAILABLE';
  end if;

  if cardinality(v_locations) > 0 then v_factor := v_factor + 0.10; end if;
  if cardinality(v_categories) > 0 then v_factor := v_factor + 0.10; end if;
  v_price := round(v_product.direct_price_mzn * v_factor, 2);
  v_end := p_starts_at + make_interval(days => v_product.duration_days);

  if (
    select count(*) from public.business_promotions bp
    where bp.ad_product_id = v_product.id
      and bp.status in ('PENDING', 'ACTIVE')
      and bp.starts_at < v_end and bp.ends_at > p_starts_at
  ) >= v_product.capacity then
    raise exception 'NO_AVAILABILITY';
  end if;

  insert into public.business_promotions(
    business_id, listing_id, title, placement, status, starts_at, ends_at,
    budget, currency, ad_product_id, payment_method, price_mzn, audience_mode
  ) values (
    p_business_id, p_listing_id, coalesce(nullif(trim(p_title), ''), v_product.name),
    v_product.placement, 'PENDING', p_starts_at, v_end, v_price, 'MZN',
    v_product.id, 'DIRECT', v_price,
    case when cardinality(v_locations) + cardinality(v_categories) > 0 then 'TARGETED' else 'GENERAL' end
  ) returning id into v_promotion;

  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'LOCATION', trim(x) from unnest(v_locations) x;
  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'CATEGORY', trim(x) from unnest(v_categories) x;

  return jsonb_build_object('promotion_id', v_promotion, 'price_mzn', v_price, 'ends_at', v_end);
end;
$$;

revoke all on function public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[]) from public, anon;
grant execute on function public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[]) to authenticated;

create or replace function public.purchase_promotion_with_credits(
  p_business_id uuid,
  p_ad_product_id uuid,
  p_listing_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_locations text[] default '{}',
  p_categories text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_product public.ad_products;
  v_wallet public.business_credit_wallets;
  v_end timestamptz;
  v_promotion uuid;
  v_factor numeric := 1;
  v_price numeric;
  v_credits integer;
  v_locations text[] := coalesce(p_locations, '{}');
  v_categories text[] := coalesce(p_categories, '{}');
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.archived_at is null and b.owner_id = v_user
  ) and not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id and bm.user_id = v_user
      and bm.role in ('owner', 'admin', 'operator')
  ) then raise exception 'FORBIDDEN'; end if;

  if p_starts_at is null or p_starts_at < now() then raise exception 'INVALID_CAMPAIGN_DATES'; end if;
  if length(trim(coalesce(p_title, ''))) > 160 then raise exception 'INVALID_CAMPAIGN_TITLE'; end if;
  if cardinality(v_locations) > 10 or cardinality(v_categories) > 10
     or exists (select 1 from unnest(v_locations || v_categories) x where length(trim(x)) = 0 or length(trim(x)) > 120) then
    raise exception 'INVALID_CAMPAIGN_TARGETS';
  end if;

  -- The same product-row lock protects inventory across both payment methods.
  select * into v_product
  from public.ad_products
  where id = p_ad_product_id and active = true and access_type = 'PAID'
  for update;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  if p_listing_id is not null and not exists (
    select 1 from public.listings l
    where l.id = p_listing_id and l.business_id = p_business_id and l.status = 'PUBLISHED'
  ) then raise exception 'LISTING_NOT_AVAILABLE'; end if;

  if cardinality(v_locations) > 0 then v_factor := v_factor + 0.10; end if;
  if cardinality(v_categories) > 0 then v_factor := v_factor + 0.10; end if;
  v_price := round(v_product.direct_price_mzn * v_factor, 2);
  v_credits := ceil(v_product.credit_price * v_factor);
  v_end := p_starts_at + make_interval(days => v_product.duration_days);

  if (
    select count(*) from public.business_promotions bp
    where bp.ad_product_id = v_product.id
      and bp.status in ('PENDING', 'ACTIVE')
      and bp.starts_at < v_end and bp.ends_at > p_starts_at
  ) >= v_product.capacity then raise exception 'NO_AVAILABILITY'; end if;

  insert into public.business_credit_wallets(business_id, balance_credits)
  values (p_business_id, 0)
  on conflict (business_id) do nothing;

  select * into v_wallet
  from public.business_credit_wallets
  where business_id = p_business_id
  for update;
  if not found or v_wallet.balance_credits < v_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.business_credit_wallets
  set balance_credits = balance_credits - v_credits, updated_at = now()
  where id = v_wallet.id;

  insert into public.business_promotions(
    business_id, listing_id, title, placement, status, starts_at, ends_at,
    budget, currency, ad_product_id, payment_method, price_mzn, credits_charged, audience_mode
  ) values (
    p_business_id, p_listing_id, coalesce(nullif(trim(p_title), ''), v_product.name),
    v_product.placement, 'ACTIVE', p_starts_at, v_end, v_price, 'MZN',
    v_product.id, 'CREDITS', v_price, v_credits,
    case when cardinality(v_locations) + cardinality(v_categories) > 0 then 'TARGETED' else 'GENERAL' end
  ) returning id into v_promotion;

  insert into public.credit_transactions(
    wallet_id, type, credits, amount_mzn, reference_type, reference_id, description
  ) values (
    v_wallet.id, 'CONSUMPTION', -v_credits, v_price, 'BUSINESS_PROMOTION',
    v_promotion, 'Publicidade: ' || v_product.name
  );

  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'LOCATION', trim(x) from unnest(v_locations) x;
  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'CATEGORY', trim(x) from unnest(v_categories) x;

  return jsonb_build_object(
    'promotion_id', v_promotion,
    'credits_charged', v_credits,
    'price_mzn', v_price,
    'ends_at', v_end
  );
end;
$$;

revoke all on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) from public, anon;
grant execute on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) to authenticated;
