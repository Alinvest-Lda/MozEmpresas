-- Self-service advertising catalogue and credit-backed purchases.
-- Applied to the production Supabase project on 2026-10-01.

create table if not exists public.ad_products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  placement text not null check (placement in ('DIRECTORY','MARKETPLACE','HOME')),
  description text,
  duration_days integer not null check (duration_days > 0),
  direct_price_mzn numeric(12,2) not null check (direct_price_mzn >= 0),
  credit_price integer not null check (credit_price > 0),
  capacity integer not null default 1 check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_promotions
  add column if not exists ad_product_id uuid references public.ad_products(id),
  add column if not exists payment_method text check (payment_method in ('DIRECT','CREDITS')),
  add column if not exists price_mzn numeric(12,2),
  add column if not exists credits_charged integer;

create index if not exists ad_products_active_idx on public.ad_products(active, placement);
create index if not exists business_promotions_product_dates_idx on public.business_promotions(ad_product_id, starts_at, ends_at);

alter table public.ad_products enable row level security;

drop policy if exists "active ad products are readable" on public.ad_products;
create policy "active ad products are readable" on public.ad_products for select to authenticated using (active = true);

drop policy if exists "platform staff manage ad products" on public.ad_products;
create policy "platform staff manage ad products" on public.ad_products for all to authenticated
using (exists (select 1 from public.platform_members pm where pm.user_id = (select auth.uid()) and pm.active = true))
with check (exists (select 1 from public.platform_members pm where pm.user_id = (select auth.uid()) and pm.active = true));

-- The credit purchase function performs authorization, capacity validation,
-- row locking, debit and transaction creation atomically.
create or replace function public.purchase_promotion_with_credits(
  p_business_id uuid, p_ad_product_id uuid, p_listing_id uuid, p_title text, p_starts_at timestamptz
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_product public.ad_products;
  v_wallet public.business_credit_wallets;
  v_end timestamptz;
  v_promotion uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if not exists (select 1 from public.businesses b where b.id=p_business_id and b.owner_id=v_user)
     and not exists (select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=v_user and bm.role in ('owner','admin','operator'))
  then raise exception 'FORBIDDEN'; end if;

  select * into v_product from public.ad_products where id=p_ad_product_id and active=true for share;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  v_end := p_starts_at + make_interval(days => v_product.duration_days);

  if (select count(*) from public.business_promotions bp where bp.ad_product_id=v_product.id and bp.status in ('PENDING','ACTIVE') and bp.starts_at < v_end and bp.ends_at > p_starts_at) >= v_product.capacity
  then raise exception 'NO_AVAILABILITY'; end if;

  select * into v_wallet from public.business_credit_wallets where business_id=p_business_id for update;
  if not found then
    insert into public.business_credit_wallets(business_id,balance_credits) values(p_business_id,0) returning * into v_wallet;
  end if;
  if v_wallet.balance_credits < v_product.credit_price then raise exception 'INSUFFICIENT_CREDITS'; end if;

  update public.business_credit_wallets set balance_credits=balance_credits-v_product.credit_price, updated_at=now() where id=v_wallet.id;

  insert into public.business_promotions(business_id,listing_id,title,placement,status,starts_at,ends_at,budget,currency,ad_product_id,payment_method,price_mzn,credits_charged)
  values(p_business_id,p_listing_id,coalesce(nullif(trim(p_title),''),v_product.name),v_product.placement,'ACTIVE',p_starts_at,v_end,v_product.direct_price_mzn,'MZN',v_product.id,'CREDITS',v_product.direct_price_mzn,v_product.credit_price)
  returning id into v_promotion;

  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
  values(v_wallet.id,'CONSUMPTION',-v_product.credit_price,v_product.direct_price_mzn,'BUSINESS_PROMOTION',v_promotion,'Compra de publicidade: '||v_product.name);

  return jsonb_build_object('promotion_id',v_promotion,'credits_charged',v_product.credit_price,'ends_at',v_end);
end;
$$;

revoke all on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz) from anon, public;
grant execute on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz) to authenticated;

insert into public.ad_products(code,name,placement,description,duration_days,direct_price_mzn,credit_price,capacity) values
('DIR_FEATURE_7','Destaque no Directório · 7 dias','DIRECTORY','Maior visibilidade da empresa nos resultados do directório.',7,500,475,3),
('DIR_FEATURE_14','Destaque no Directório · 14 dias','DIRECTORY','Maior visibilidade da empresa nos resultados do directório.',14,900,850,3),
('DIR_FEATURE_30','Destaque no Directório · 30 dias','DIRECTORY','Maior visibilidade da empresa nos resultados do directório.',30,1500,1400,3),
('MKT_FEATURE_7','Destaque no Marketplace · 7 dias','MARKETPLACE','Destaque para uma oferta publicada no Marketplace.',7,750,700,3),
('MKT_FEATURE_14','Destaque no Marketplace · 14 dias','MARKETPLACE','Destaque para uma oferta publicada no Marketplace.',14,1350,1250,3),
('MKT_FEATURE_30','Destaque no Marketplace · 30 dias','MARKETPLACE','Destaque para uma oferta publicada no Marketplace.',30,2250,2100,3),
('BUSINESS_FEATURE_7','Destaque da empresa · 7 dias','DIRECTORY','Campanha de destaque da empresa.',7,1000,950,2),
('BUSINESS_FEATURE_14','Destaque da empresa · 14 dias','DIRECTORY','Campanha de destaque da empresa.',14,1800,1700,2),
('BUSINESS_FEATURE_30','Destaque da empresa · 30 dias','DIRECTORY','Campanha de destaque da empresa.',30,3000,2800,2),
('DIR_BANNER_7','Banner no Directório · 7 dias','DIRECTORY','Espaço publicitário em formato banner.',7,1500,1400,2),
('DIR_BANNER_14','Banner no Directório · 14 dias','DIRECTORY','Espaço publicitário em formato banner.',14,2700,2500,2),
('DIR_BANNER_30','Banner no Directório · 30 dias','DIRECTORY','Espaço publicitário em formato banner.',30,4500,4200,2),
('MKT_BANNER_7','Banner no Marketplace · 7 dias','MARKETPLACE','Espaço publicitário em formato banner.',7,2000,1850,2),
('MKT_BANNER_14','Banner no Marketplace · 14 dias','MARKETPLACE','Espaço publicitário em formato banner.',14,3600,3300,2),
('MKT_BANNER_30','Banner no Marketplace · 30 dias','MARKETPLACE','Espaço publicitário em formato banner.',30,6000,5500,2),
('HOME_BANNER_7','Banner na Home · 7 dias','HOME','Espaço publicitário na página inicial.',7,3000,2800,1),
('HOME_BANNER_14','Banner na Home · 14 dias','HOME','Espaço publicitário na página inicial.',14,5500,5100,1),
('HOME_BANNER_30','Banner na Home · 30 dias','HOME','Espaço publicitário na página inicial.',30,9000,8300,1),
('HOME_BILLBOARD_7','Billboard Home · 7 dias','HOME','Espaço publicitário premium no hero da página inicial.',7,5000,4700,1),
('HOME_BILLBOARD_14','Billboard Home · 14 dias','HOME','Espaço publicitário premium no hero da página inicial.',14,9000,8400,1),
('HOME_BILLBOARD_30','Billboard Home · 30 dias','HOME','Espaço publicitário premium no hero da página inicial.',30,15000,14000,1)
on conflict (code) do update set name=excluded.name,placement=excluded.placement,description=excluded.description,duration_days=excluded.duration_days,direct_price_mzn=excluded.direct_price_mzn,credit_price=excluded.credit_price,capacity=excluded.capacity,active=true,updated_at=now();


-- Targeted visibility: the same limited inventory can be sold to a more relevant audience
-- without creating additional ad slots or increasing page density.
alter table public.business_promotions
  add column if not exists audience_mode text not null default 'GENERAL'
    check (audience_mode in ('GENERAL','TARGETED'));

create index if not exists business_promotions_audience_mode_idx
  on public.business_promotions(audience_mode);

-- Pricing rule: general visibility uses the catalogue price; one targeting dimension adds 10%,
-- two dimensions add 20%. Targeting never creates a new placement or additional inventory.
create or replace function public.purchase_promotion_with_credits(
  p_business_id uuid, p_ad_product_id uuid, p_listing_id uuid, p_title text,
  p_starts_at timestamptz, p_locations text[] default '{}', p_categories text[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid(); v_product public.ad_products; v_wallet public.business_credit_wallets;
  v_end timestamptz; v_promotion uuid; v_factor numeric := 1; v_price numeric; v_credits integer;
  v_locations text[] := coalesce(p_locations,'{}'); v_categories text[] := coalesce(p_categories,'{}');
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.businesses b where b.id=p_business_id and b.owner_id=v_user)
     and not exists (select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=v_user and bm.role in ('owner','admin','operator')) then raise exception 'FORBIDDEN'; end if;
  select * into v_product from public.ad_products where id=p_ad_product_id and active=true and access_type='PAID' for share;
  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  if cardinality(v_locations)>0 then v_factor := v_factor + 0.10; end if;
  if cardinality(v_categories)>0 then v_factor := v_factor + 0.10; end if;
  v_price := round(v_product.direct_price_mzn * v_factor,2);
  v_credits := ceil(v_product.credit_price * v_factor);
  v_end := p_starts_at + make_interval(days => v_product.duration_days);
  if (select count(*) from public.business_promotions bp where bp.ad_product_id=v_product.id and bp.status in ('PENDING','ACTIVE') and bp.starts_at < v_end and bp.ends_at > p_starts_at) >= v_product.capacity then raise exception 'NO_AVAILABILITY'; end if;
  select * into v_wallet from public.business_credit_wallets where business_id=p_business_id for update;
  if not found then insert into public.business_credit_wallets(business_id,balance_credits) values(p_business_id,0) returning * into v_wallet; end if;
  if v_wallet.balance_credits < v_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;
  update public.business_credit_wallets set balance_credits=balance_credits-v_credits,updated_at=now() where id=v_wallet.id;
  insert into public.business_promotions(business_id,listing_id,title,placement,status,starts_at,ends_at,budget,currency,ad_product_id,payment_method,price_mzn,credits_charged,audience_mode)
  values(p_business_id,p_listing_id,coalesce(nullif(trim(p_title),''),v_product.name),v_product.placement,'ACTIVE',p_starts_at,v_end,v_price,'MZN',v_product.id,'CREDITS',v_price,v_credits,case when cardinality(v_locations)+cardinality(v_categories)>0 then 'TARGETED' else 'GENERAL' end)
  returning id into v_promotion;
  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
  values(v_wallet.id,'CONSUMPTION',-v_credits,v_price,'BUSINESS_PROMOTION',v_promotion,'Publicidade: '||v_product.name||case when cardinality(v_locations)+cardinality(v_categories)>0 then ' · visibilidade direccionada' else '' end);
  insert into public.business_promotion_targets(promotion_id,target_type,target_value) select v_promotion,'LOCATION',trim(x) from unnest(v_locations) x where trim(x)<>'';
  insert into public.business_promotion_targets(promotion_id,target_type,target_value) select v_promotion,'CATEGORY',trim(x) from unnest(v_categories) x where trim(x)<>'';
  return jsonb_build_object('promotion_id',v_promotion,'credits_charged',v_credits,'price_mzn',v_price,'ends_at',v_end);
end; $$;
revoke all on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) from anon, public;
grant execute on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz,text[],text[]) to authenticated;
revoke execute on function public.purchase_promotion_with_credits(uuid,uuid,uuid,text,timestamptz) from anon, public, authenticated;
