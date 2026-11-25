-- F3.57: immutable listing moderation history with owner/admin read boundaries.
create table if not exists public.listing_moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  old_status public.listing_status,
  new_status public.listing_status not null,
  created_at timestamptz not null default now()
);
create index if not exists listing_moderation_events_listing_created_idx
  on public.listing_moderation_events(listing_id, created_at desc);
alter table public.listing_moderation_events enable row level security;
revoke all on public.listing_moderation_events from anon, authenticated;
grant select on public.listing_moderation_events to authenticated;
grant all on public.listing_moderation_events to service_role;
drop policy if exists "listing moderation history participants read" on public.listing_moderation_events;
create policy "listing moderation history participants read"
on public.listing_moderation_events for select to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_moderation_events.listing_id
      and (
        l.owner_id = (select auth.uid())
        or exists (
          select 1 from public.business_members bm
          where bm.business_id = l.business_id
            and bm.user_id = (select auth.uid())
            and bm.role in ('owner','admin','operator')
        )
        or exists (
          select 1 from public.platform_members pm
          where pm.user_id = (select auth.uid())
            and pm.active and pm.role = 'super_admin'
        )
      )
  )
);
create or replace function public.capture_listing_moderation_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if new.status is distinct from old.status then
    insert into public.listing_moderation_events(listing_id, actor_user_id, old_status, new_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$function$;
revoke all on function public.capture_listing_moderation_event() from public, anon, authenticated;
drop trigger if exists capture_listing_moderation_event_trigger on public.listings;
create trigger capture_listing_moderation_event_trigger
after update of status on public.listings
for each row execute function public.capture_listing_moderation_event();
insert into public.listing_moderation_events(listing_id, actor_user_id, old_status, new_status, created_at)
select l.id, l.owner_id, l.status, l.status, l.updated_at
from public.listings l
where not exists (
  select 1 from public.listing_moderation_events e where e.listing_id = l.id
);
