alter table public.businesses add column if not exists archived_at timestamptz;

create index if not exists businesses_archived_at_idx on public.businesses (archived_at);

drop policy if exists "businesses_public_read" on public.businesses;
create policy "businesses_public_read" on public.businesses
for select to anon, authenticated
using (
  archived_at is null
  and (
    is_public = true
    or (select auth.uid()) = owner_id
  )
);

create policy "business managers read businesses" on public.businesses
for select to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = businesses.id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
  )
);

create policy "business managers update businesses" on public.businesses
for update to authenticated
using (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = businesses.id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
  )
)
with check (
  exists (
    select 1 from public.business_members bm
    where bm.business_id = businesses.id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
  )
);

drop policy if exists "businesses_owner_delete" on public.businesses;

comment on column public.businesses.archived_at is 'Soft-delete timestamp. Archived businesses remain available for historical/commercial integrity but are excluded from public discovery.';