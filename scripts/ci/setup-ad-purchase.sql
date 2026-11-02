-- Disposable fixture for atomic business advertising inventory and payment flows.
alter table public.businesses add column if not exists archived_at timestamptz;
alter table public.listings add column if not exists business_id uuid;
alter table public.listings add column if not exists status text;
update public.listings set business_id='20000000-0000-4000-8000-000000000002', status='PUBLISHED'
where id='40000000-0000-4000-8000-000000000001';
insert into public.listings(id,title,business_id,status)
values ('40000000-0000-4000-8000-000000000002','Oferta própria','20000000-0000-4000-8000-000000000001','PUBLISHED');

create table public.ad_products (
  id uuid primary key,
  name text not null,
  placement text not null,
  duration_days integer not null,
  direct_price_mzn numeric(12,2) not null,
  credit_price integer not null,
  capacity integer not null,
  active boolean not null default true,
  access_type text not null default 'PAID'
);
create table public.business_promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id),
  listing_id uuid references public.listings(id),
  title text not null,
  placement text not null,
  status text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  budget numeric(12,2) not null,
  currency text not null,
  ad_product_id uuid not null references public.ad_products(id),
  payment_method text not null check (payment_method in ('DIRECT','CREDITS')),
  price_mzn numeric(12,2) not null,
  credits_charged integer,
  audience_mode text not null
);
create table public.business_promotion_targets (
  id bigint generated always as identity primary key,
  promotion_id uuid not null references public.business_promotions(id) on delete cascade,
  target_type text not null,
  target_value text not null
);
create table public.business_credit_wallets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id),
  balance_credits integer not null,
  updated_at timestamptz not null default now()
);
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.business_credit_wallets(id),
  type text not null,
  credits integer not null,
  amount_mzn numeric(12,2) not null,
  reference_type text not null,
  reference_id uuid not null,
  description text not null
);

insert into public.ad_products(id,name,placement,duration_days,direct_price_mzn,credit_price,capacity,active,access_type) values
 ('60000000-0000-4000-8000-000000000001','Destaque Direct','DIRECTORY',7,500,50,1,true,'PAID'),
 ('60000000-0000-4000-8000-000000000002','Destaque Créditos','DIRECTORY',7,500,50,2,true,'PAID');
insert into public.business_credit_wallets(business_id,balance_credits)
values ('20000000-0000-4000-8000-000000000001',200);
