-- Fix RLS recursion by resolving managed businesses through a SECURITY DEFINER helper.
create schema if not exists private;

create or replace function private.user_managed_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
  from public.businesses b
  where b.owner_id = (select auth.uid())
  union
  select bm.business_id
  from public.business_members bm
  where bm.user_id = (select auth.uid())
    and bm.role in ('owner','admin','operator')
$$;

revoke all on function private.user_managed_business_ids() from public;
grant execute on function private.user_managed_business_ids() to authenticated;

drop policy if exists "business managers read businesses" on public.businesses;
create policy "business managers read businesses" on public.businesses
for select to authenticated
using (id in (select private.user_managed_business_ids()));

drop policy if exists "business managers update businesses" on public.businesses;
create policy "business managers update businesses" on public.businesses
for update to authenticated
using (id in (select private.user_managed_business_ids()))
with check (id in (select private.user_managed_business_ids()));

drop policy if exists "members_select_own" on public.business_members;
create policy "members_select_own" on public.business_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or business_id in (select private.user_managed_business_ids())
);

drop policy if exists "members_update_managers" on public.business_members;
create policy "members_update_managers" on public.business_members
for update to authenticated
using (business_id in (select private.user_managed_business_ids()))
with check (business_id in (select private.user_managed_business_ids()));

drop policy if exists "members_delete_managers" on public.business_members;
create policy "members_delete_managers" on public.business_members
for delete to authenticated
using (
  role <> 'owner'
  and business_id in (select private.user_managed_business_ids())
);

-- Keep listing access independent from recursive business_members RLS.
drop policy if exists "published listings are readable" on public.listings;
create policy "published listings are readable" on public.listings
for select to anon, authenticated
using (
  (
    status = 'PUBLISHED'::listing_status
    and (
      business_id is null
      or exists (
        select 1 from public.businesses b
        where b.id = listings.business_id
          and b.archived_at is null
      )
    )
  )
  or owner_id = (select auth.uid())
  or business_id in (select private.user_managed_business_ids())
);

drop policy if exists "business managers create listings" on public.listings;
create policy "business managers create listings" on public.listings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    business_id is null
    or business_id in (select private.user_managed_business_ids())
  )
);

drop policy if exists "business managers update listings" on public.listings;
create policy "business managers update listings" on public.listings
for update to authenticated
using (
  owner_id = (select auth.uid())
  or business_id in (select private.user_managed_business_ids())
)
with check (
  business_id is null
  or business_id in (select private.user_managed_business_ids())
);

drop policy if exists "business managers delete listings" on public.listings;
create policy "business managers delete listings" on public.listings
for delete to authenticated
using (
  owner_id = (select auth.uid())
  or business_id in (select private.user_managed_business_ids())
);
