-- Unified advertising inventory: one vocabulary for public surfaces and creative fields.
-- This migration is idempotent because the production schema was reconciled during the rollout.
alter table public.ad_products add column if not exists slot text;
alter table public.business_promotions add column if not exists slot text;
alter table public.business_promotions add column if not exists creative_type text default 'TEXT';
alter table public.business_promotions add column if not exists headline text;
alter table public.business_promotions add column if not exists body text;
alter table public.business_promotions add column if not exists image_url text;
alter table public.business_promotions add column if not exists target_url text;
alter table public.business_promotions add column if not exists cta_label text;
alter table public.business_promotions add column if not exists alt_text text;
alter table public.partner_ad_products add column if not exists surface text;
alter table public.partner_ad_products add column if not exists slot text;
alter table public.partner_ad_campaigns add column if not exists surface text;
alter table public.partner_ad_campaigns add column if not exists slot text;
alter table public.partner_ad_campaigns add column if not exists creative_type text default 'TEXT';
alter table public.partner_ad_campaigns add column if not exists headline text;
alter table public.partner_ad_campaigns add column if not exists body text;
alter table public.partner_ad_campaigns add column if not exists image_url text;
alter table public.partner_ad_campaigns add column if not exists target_url text;
alter table public.partner_ad_campaigns add column if not exists cta_label text;
alter table public.partner_ad_campaigns add column if not exists alt_text text;

alter table public.ad_products drop constraint if exists ad_products_placement_check;
alter table public.ad_products add constraint ad_products_placement_check
check (placement = any (array['DIRECTORY','MARKETPLACE','HOME','OPPORTUNITIES']));

create table if not exists public.advertising_requests (
 id uuid primary key default gen_random_uuid(),
 business_id uuid references public.businesses(id) on delete set null,
 company_name text not null, contact_name text not null, email text not null, phone text,
 surface text not null default 'DIRECTORY', slot text not null default 'BILLBOARD',
 creative_type text not null default 'BANNER', package_name text,
 headline text, body text, image_url text, target_url text, cta_label text, alt_text text,
 starts_at timestamptz, ends_at timestamptz, message text,
 status text not null default 'REQUESTED', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.advertising_requests enable row level security;
drop policy if exists advertising_requests_public_insert on public.advertising_requests;
create policy advertising_requests_public_insert on public.advertising_requests
for insert to anon, authenticated with check (true);
grant insert on public.advertising_requests to anon, authenticated;

update public.ad_products set slot=case
 when code like '%FEATURE%' then 'FEATURED'
 when code like '%BANNER%' then case when placement='HOME' then 'HERO' else 'BILLBOARD' end
 when code like 'FREE_%' then 'ORGANIC' else 'BILLBOARD' end where slot is null;

update public.partner_ad_products set
 surface=case when placement in ('HOME_PARTNER','INSTITUTIONAL') then 'HOME'
 when placement in ('OPPORTUNITIES','CONTENT_SPONSORSHIP') then 'OPPORTUNITIES'
 when placement in ('CATEGORY','CATEGORY_SPONSORSHIP') then 'DIRECTORY'
 when placement='SEGMENTED' then 'MARKETPLACE' else 'PARTNER_INTELLIGENCE' end,
 slot=case when placement in ('HOME_PARTNER','INSTITUTIONAL') then 'HERO'
 when placement='OPPORTUNITIES' then 'BILLBOARD'
 when placement in ('CONTENT_SPONSORSHIP','SEGMENTED') then 'INFEED'
 when placement in ('CATEGORY','CATEGORY_SPONSORSHIP','INTELLIGENCE') then 'CONTEXT'
 else 'BILLBOARD' end;

update public.partner_ad_campaigns c set surface=p.surface, slot=p.slot
from public.partner_ad_products p where p.id=c.product_id and (c.surface is null or c.slot is null);

insert into public.ad_products(code,name,placement,description,duration_days,direct_price_mzn,credit_price,capacity,active,access_type,audience_level,slot)
values
('OPP_BANNER_7','Banner em Oportunidades · 7 dias','OPPORTUNITIES','Posição de destaque na área pública de oportunidades.',7,2000,1850,2,true,'PAID','GENERAL','BILLBOARD'),
('OPP_FEATURE_14','Destaque em Oportunidades · 14 dias','OPPORTUNITIES','Destaque contextual para uma empresa ou oferta elegível.',14,3000,2800,3,true,'PAID','GENERAL','FEATURED')
on conflict (code) do update set placement=excluded.placement,slot=excluded.slot,active=true;

create index if not exists advertising_requests_status_idx on public.advertising_requests(status,created_at desc);
create index if not exists business_promotions_inventory_idx on public.business_promotions(placement,slot,status,starts_at,ends_at);
create index if not exists partner_ad_campaigns_inventory_idx on public.partner_ad_campaigns(surface,slot,status,starts_at,ends_at);
