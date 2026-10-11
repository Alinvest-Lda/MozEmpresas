create table if not exists public.platform_conversion_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  visitor_key text not null,
  event_type text not null check (event_type in ('PROFILE_VIEW','CONTACT_CLICK','WHATSAPP_SHARE','SEARCH_SUBMITTED','SEARCH_SAVED','FAVORITE_SAVED','OPPORTUNITY_APPLY','SIGNUP_CLICK','AD_CLICK')),
  entity_type text,
  entity_id uuid,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.platform_conversion_events enable row level security;
drop policy if exists "visitors record conversion events" on public.platform_conversion_events;
create policy "visitors record conversion events" on public.platform_conversion_events for insert to anon, authenticated with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "users read own conversion events" on public.platform_conversion_events;
create policy "users read own conversion events" on public.platform_conversion_events for select to authenticated using (user_id = (select auth.uid()) or public.is_super_admin());
create index if not exists platform_conversion_events_user_date_idx on public.platform_conversion_events(user_id,created_at desc);
create index if not exists platform_conversion_events_type_date_idx on public.platform_conversion_events(event_type,created_at desc);