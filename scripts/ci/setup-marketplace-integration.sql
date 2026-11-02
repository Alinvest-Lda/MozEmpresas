-- Disposable, focused PostgreSQL fixture for marketplace/service RLS and notifications.
-- This is deliberately not a production schema dump; only dependencies of the
-- selected, current policies/triggers are represented here.
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end
$roles$;

create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid()
returns uuid language sql stable
as $function$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;

create table public.businesses (
  id uuid primary key,
  owner_id uuid not null,
  name text not null
);
create table public.business_members (
  business_id uuid not null,
  user_id uuid not null,
  role text not null,
  primary key (business_id, user_id)
);
create table public.platform_services (id uuid primary key);
create table public.listings (id uuid primary key, title text not null);
create table public.commerce_orders (
  id uuid primary key,
  buyer_user_id uuid not null,
  buyer_business_id uuid,
  status text not null,
  payment_status text not null default 'NOT_REQUIRED',
  fulfillment_status text not null default 'NOT_STARTED'
);
create table public.commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  listing_id uuid references public.listings(id),
  seller_business_id uuid,
  title text not null
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.business_buyer_interests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
);
create table public.access_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid,
  business_id uuid
);

alter table public.commerce_orders enable row level security;
alter table public.commerce_order_items enable row level security;
alter table public.notifications enable row level security;
alter table public.business_buyer_interests enable row level security;
alter table public.access_audit_log enable row level security;

grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select, insert, update on public.commerce_orders to authenticated;
grant select, insert on public.commerce_order_items to authenticated;
grant select on public.notifications to authenticated;
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id=(select auth.uid()));
grant select, insert, update on public.business_buyer_interests to authenticated;

insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003'),
 ('10000000-0000-4000-8000-000000000004');

insert into public.businesses(id, owner_id, name) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Comprador A'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Vendedor B');

insert into public.business_members(business_id,user_id,role) values
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','admin');

insert into public.platform_services(id) values
 ('30000000-0000-4000-8000-000000000001');

insert into public.listings(id,title) values
 ('40000000-0000-4000-8000-000000000001','Oferta do Vendedor B');

-- Apply the actual current migration policies and notification triggers.
