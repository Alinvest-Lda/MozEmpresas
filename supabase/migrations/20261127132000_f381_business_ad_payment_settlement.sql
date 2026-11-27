-- F3.81: explicit Super Admin settlement evidence for business M-Pesa ad requests.
alter table public.business_promotions
  drop constraint if exists business_promotions_payment_method_check;
alter table public.business_promotions
  add constraint business_promotions_payment_method_check
  check (payment_method is null or payment_method in ('DIRECT','CREDITS','MPESA'));

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
    where b.id = p_business_id and b.archived_at is null
  ) then raise exception 'BUSINESS_NOT_AVAILABLE'; end if;

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
  where id = p_ad_product_id and active = true and access_type = 'PAID'
  for update;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if v_product.direct_price_mzn is null or v_product.direct_price_mzn<=0 then
    raise exception 'INVALID_PRODUCT_PRICE';
  end if;

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
      and bp.status in ('PENDING', 'ACTIVE', 'PAUSED')
      and bp.starts_at < v_end and bp.ends_at > p_starts_at
  ) >= v_product.capacity then
    raise exception 'NO_AVAILABILITY';
  end if;

  insert into public.business_promotions(
    business_id, listing_id, title, placement, slot, status, starts_at, ends_at,
    budget, currency, ad_product_id, payment_method, price_mzn, audience_mode
  ) values (
    p_business_id, p_listing_id, coalesce(nullif(trim(p_title), ''), v_product.name),
    v_product.placement, v_product.slot, 'PENDING', p_starts_at, v_end, v_price, 'MZN',
    v_product.id, 'MPESA', v_price,
    case when cardinality(v_locations) + cardinality(v_categories) > 0 then 'TARGETED' else 'GENERAL' end
  ) returning id into v_promotion;

  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'LOCATION', trim(x) from unnest(v_locations) x;
  insert into public.business_promotion_targets(promotion_id, target_type, target_value)
  select v_promotion, 'CATEGORY', trim(x) from unnest(v_categories) x;

  return jsonb_build_object('promotion_id', v_promotion, 'price_mzn', v_price, 'ends_at', v_end);
end;
$$;

revoke all on function public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[]) from public,anon;
grant execute on function public.request_promotion_with_mpesa(uuid,uuid,uuid,text,timestamptz,text[],text[]) to authenticated;

create table if not exists public.business_promotion_payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null unique references public.business_promotions(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  payment_reference text not null unique check(length(trim(payment_reference)) between 4 and 160),
  amount_mzn numeric(14,2) not null check(amount_mzn>0),
  payment_method text not null check(payment_method='MPESA'),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  notes text
);
create index if not exists business_promotion_payment_confirmations_business_idx
  on public.business_promotion_payment_confirmations(business_id,confirmed_at desc);
alter table public.business_promotion_payment_confirmations enable row level security;
revoke all on public.business_promotion_payment_confirmations from public,anon,authenticated;
grant select on public.business_promotion_payment_confirmations to authenticated;
create policy "Super admins read business promotion payment confirmations"
on public.business_promotion_payment_confirmations for select to authenticated
using(exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));

create or replace function public.prevent_business_promotion_payment_confirmation_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
  raise exception 'BUSINESS_PROMOTION_PAYMENT_CONFIRMATION_IMMUTABLE' using errcode='23514';
end;
$$;
revoke all on function public.prevent_business_promotion_payment_confirmation_mutation() from public,anon,authenticated;
drop trigger if exists business_promotion_payment_confirmations_immutable on public.business_promotion_payment_confirmations;
create trigger business_promotion_payment_confirmations_immutable
before update or delete on public.business_promotion_payment_confirmations
for each row execute function public.prevent_business_promotion_payment_confirmation_mutation();

create or replace function public.admin_confirm_business_promotion_mpesa_payment(
  p_promotion_id uuid,
  p_payment_reference text,
  p_amount_mzn numeric,
  p_notes text default null
) returns jsonb
language plpgsql security definer
set search_path=pg_catalog,public,pg_temp
as $$
declare
  v_promotion public.business_promotions%rowtype;
  v_reference text:=nullif(trim(coalesce(p_payment_reference,'')),'');
  v_notes text:=nullif(trim(coalesce(p_notes,'')),'');
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if p_promotion_id is null or v_reference is null or length(v_reference)<4 or length(v_reference)>160
    or p_amount_mzn is null or p_amount_mzn<=0 or p_amount_mzn>=1000000000000
    or length(coalesce(v_notes,''))>500 then
    raise exception 'INVALID_BUSINESS_AD_PAYMENT_EVIDENCE' using errcode='22023';
  end if;

  select * into v_promotion from public.business_promotions where id=p_promotion_id for update;
  if not found then raise exception 'PROMOTION_NOT_FOUND' using errcode='P0002'; end if;
  if v_promotion.status<>'PENDING' or v_promotion.payment_method<>'MPESA' or v_promotion.paid_at is not null then
    raise exception 'PROMOTION_NOT_AWAITING_MPESA_SETTLEMENT' using errcode='23514';
  end if;
  if v_promotion.price_mzn is null or p_amount_mzn<>v_promotion.price_mzn then
    raise exception 'BUSINESS_AD_PAYMENT_AMOUNT_MISMATCH' using errcode='23514';
  end if;

  insert into public.business_promotion_payment_confirmations(
    promotion_id,business_id,payment_reference,amount_mzn,payment_method,confirmed_by,notes
  ) values(
    v_promotion.id,v_promotion.business_id,v_reference,p_amount_mzn,'MPESA',auth.uid(),v_notes
  );

  update public.business_promotions
  set payment_reference=v_reference,paid_at=now(),updated_at=now()
  where id=v_promotion.id;

  return jsonb_build_object('promotion_id',v_promotion.id,'payment_reference',v_reference,
    'amount_mzn',p_amount_mzn,'paid_at',now(),'status','PENDING');
end;
$$;
revoke all on function public.admin_confirm_business_promotion_mpesa_payment(uuid,text,numeric,text) from public,anon;
grant execute on function public.admin_confirm_business_promotion_mpesa_payment(uuid,text,numeric,text) to authenticated;
