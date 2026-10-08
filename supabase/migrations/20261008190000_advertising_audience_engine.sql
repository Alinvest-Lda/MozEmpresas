-- MozEmpresas Advertising & Audience Engine
alter table public.business_promotions
  add column if not exists campaign_kind text not null default 'AUCTION',
  add column if not exists priority integer not null default 50,
  add column if not exists bid_cpm numeric not null default 0,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

alter table public.partner_ad_campaigns
  add column if not exists campaign_kind text not null default 'GUARANTEED',
  add column if not exists priority integer not null default 70,
  add column if not exists bid_cpm numeric not null default 0,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

alter table public.advertising_requests
  add column if not exists audience_mode text not null default 'CONTEXTUAL',
  add column if not exists budget numeric,
  add column if not exists bid_cpm numeric,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

create table if not exists public.ad_visitor_profiles (
  visitor_key text primary key,
  user_id uuid null references auth.users(id) on delete set null,
  interests jsonb not null default '{}'::jsonb,
  last_context jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.ad_delivery_events (
  id uuid primary key default gen_random_uuid(),
  visitor_key text not null,
  user_id uuid null references auth.users(id) on delete set null,
  campaign_source text not null,
  campaign_id uuid not null,
  surface text not null,
  slot text not null,
  event_type text not null check (event_type in ('IMPRESSION','CLICK')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_delivery_frequency_idx on public.ad_delivery_events(visitor_key,campaign_source,campaign_id,event_type,created_at desc);
create index if not exists ad_delivery_context_idx on public.ad_delivery_events(surface,slot,event_type,created_at desc);
create index if not exists ad_visitor_profiles_last_seen_idx on public.ad_visitor_profiles(last_seen_at desc);

alter table public.ad_visitor_profiles enable row level security;
alter table public.ad_delivery_events enable row level security;

drop policy if exists ad_visitor_profiles_insert on public.ad_visitor_profiles;
drop policy if exists ad_visitor_profiles_update on public.ad_visitor_profiles;
drop policy if exists ad_delivery_events_insert on public.ad_delivery_events;

create policy ad_visitor_profiles_insert on public.ad_visitor_profiles for insert to anon,authenticated with check (user_id is null or user_id=(select auth.uid()));
create policy ad_visitor_profiles_update on public.ad_visitor_profiles for update to anon,authenticated using (user_id is null or user_id=(select auth.uid())) with check (user_id is null or user_id=(select auth.uid()));
create policy ad_delivery_events_insert on public.ad_delivery_events for insert to anon,authenticated with check (user_id is null or user_id=(select auth.uid()));

grant select,insert,update on public.ad_visitor_profiles to anon,authenticated;
grant insert on public.ad_delivery_events to anon,authenticated;

-- The production rollout also creates/replaces these two functions.
-- They always derive user identity from auth.uid(); client-supplied user IDs are ignored.
