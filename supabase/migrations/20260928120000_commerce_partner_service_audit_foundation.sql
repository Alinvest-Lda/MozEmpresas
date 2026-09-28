create table if not exists public.business_partner_relationships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  partner_business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('PENDING','ACTIVE','PAUSED','ENDED')),
  relationship_type text not null default 'PARTNERSHIP',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, partner_business_id),
  check (business_id <> partner_business_id)
);
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.platform_services(id) on delete restrict,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_business_id uuid references public.businesses(id) on delete set null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED','UNDER_REVIEW','QUOTED','ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED')),
  requested_price numeric(14,2), currency text not null default 'MZN', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.commerce_order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.commerce_orders(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null, from_status text, to_status text not null, note text, created_at timestamptz not null default now()
);
create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade, listing_id uuid references public.listings(id) on delete cascade,
  event_type text not null check (event_type in ('VIEW','SEARCH','CLICK','CONTACT','SAVE','PURCHASE')), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists idx_partner_business on public.business_partner_relationships(business_id,status);
create index if not exists idx_partner_partner on public.business_partner_relationships(partner_business_id,status);
create index if not exists idx_service_requests_user on public.service_requests(requester_user_id,status);
create index if not exists idx_service_requests_business on public.service_requests(requester_business_id,status);
create index if not exists idx_order_events_order on public.commerce_order_events(order_id,created_at desc);
create index if not exists idx_recommendation_events_user on public.recommendation_events(user_id,created_at desc);
alter table public.business_partner_relationships enable row level security;
alter table public.service_requests enable row level security;
alter table public.commerce_order_events enable row level security;
alter table public.recommendation_events enable row level security;
create policy "partner relationships members read" on public.business_partner_relationships for select to authenticated using (
  exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
  or exists (select 1 from public.business_members bm where bm.business_id=business_partner_relationships.business_id and bm.user_id=(select auth.uid()))
  or exists (select 1 from public.businesses b where b.id=partner_business_id and b.owner_id=(select auth.uid()))
  or exists (select 1 from public.business_members bm where bm.business_id=business_partner_relationships.partner_business_id and bm.user_id=(select auth.uid()))
);
create policy "partner relationships managers write" on public.business_partner_relationships for all to authenticated using (
  exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
  or exists (select 1 from public.business_members bm where bm.business_id=business_partner_relationships.business_id and bm.user_id=(select auth.uid()) and bm.role in ('admin','operator'))
) with check (
  exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
  or exists (select 1 from public.business_members bm where bm.business_id=business_partner_relationships.business_id and bm.user_id=(select auth.uid()) and bm.role in ('admin','operator'))
);
create policy "service requests requester read" on public.service_requests for select to authenticated using (
 requester_user_id=(select auth.uid()) or exists(select 1 from public.businesses b where b.id=requester_business_id and b.owner_id=(select auth.uid())) or exists(select 1 from public.business_members bm where bm.business_id=service_requests.requester_business_id and bm.user_id=(select auth.uid()))
);
create policy "service requests requester create" on public.service_requests for insert to authenticated with check (
 requester_user_id=(select auth.uid()) and (requester_business_id is null or exists(select 1 from public.businesses b where b.id=requester_business_id and b.owner_id=(select auth.uid())) or exists(select 1 from public.business_members bm where bm.business_id=service_requests.requester_business_id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator')))
);
create policy "service requests requester update" on public.service_requests for update to authenticated using(requester_user_id=(select auth.uid())) with check(requester_user_id=(select auth.uid()));
create policy "order events participants read" on public.commerce_order_events for select to authenticated using (
 exists(select 1 from public.commerce_orders o where o.id=order_id and o.buyer_user_id=(select auth.uid()))
 or exists(select 1 from public.commerce_order_items oi join public.businesses b on b.id=oi.seller_business_id where oi.order_id=commerce_order_events.order_id and (b.owner_id=(select auth.uid()) or exists(select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=(select auth.uid()))))
);
create policy "recommendation events own" on public.recommendation_events for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "seller can view order items" on public.commerce_order_items for select to authenticated using (
 exists(select 1 from public.businesses b where b.id=seller_business_id and (b.owner_id=(select auth.uid()) or exists(select 1 from public.business_members bm where bm.business_id=b.id and bm.user_id=(select auth.uid()))))
);
grant select,insert,update on public.business_partner_relationships to authenticated;
grant select,insert,update on public.service_requests to authenticated;
grant select,insert on public.commerce_order_events to authenticated;
grant select,insert on public.recommendation_events to authenticated;
grant select on public.commerce_order_items to authenticated;
drop policy if exists "access_audit_log_insert" on public.access_audit_log;
create policy "access_audit_log_insert" on public.access_audit_log for insert to authenticated with check (
 actor_user_id=(select auth.uid()) and exists(select 1 from public.businesses b where b.id=access_audit_log.business_id and b.owner_id=(select auth.uid()))
);
grant insert on public.access_audit_log to authenticated;