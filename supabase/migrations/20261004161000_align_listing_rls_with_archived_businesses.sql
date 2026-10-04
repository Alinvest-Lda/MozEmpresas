drop policy if exists "published listings are readable" on public.listings;
create policy "published listings are readable" on public.listings
for select to anon, authenticated
using (
  (
    status = 'PUBLISHED'::listing_status
    and (
      business_id is null
      or exists (select 1 from public.businesses b where b.id = listings.business_id and b.archived_at is null)
    )
  )
  or owner_id = (select auth.uid())
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = listings.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
  )
);

drop policy if exists "business managers create listings" on public.listings;
create policy "business managers create listings" on public.listings
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    business_id is null
    or exists (
      select 1 from public.business_members bm
      join public.businesses b on b.id = bm.business_id
      where bm.business_id = listings.business_id
        and bm.user_id = (select auth.uid())
        and bm.role in ('owner','admin','operator')
        and b.archived_at is null
    )
  )
);

drop policy if exists "business managers update listings" on public.listings;
create policy "business managers update listings" on public.listings
for update to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = listings.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
  )
)
with check (
  business_id is null
  or exists (
    select 1 from public.business_members bm
    join public.businesses b on b.id = bm.business_id
    where bm.business_id = listings.business_id
      and bm.user_id = (select auth.uid())
      and bm.role in ('owner','admin','operator')
      and b.archived_at is null
  )
);

