-- F3.20: correct tenant scoping on promotion cancellation reads, optimize subscription auth checks,
-- and cover private partner-access grant foreign keys.
drop policy if exists "business members read own promotion cancellation"
  on public.business_promotion_cancellations;

create policy "business members read own promotion cancellation"
on public.business_promotion_cancellations
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = business_promotion_cancellations.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = business_promotion_cancellations.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner','admin','operator']::text[])
  )
  or exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true
      and pm.role = 'super_admin'
  )
);

drop policy if exists "service subscriptions owner read"
  on public.platform_service_subscriptions;

create policy "service subscriptions owner read"
on public.platform_service_subscriptions
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = platform_service_subscriptions.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = platform_service_subscriptions.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner','admin','operator']::text[])
  )
  or exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true
  )
);

drop policy if exists "service subscriptions owner update"
  on public.platform_service_subscriptions;

create policy "service subscriptions owner update"
on public.platform_service_subscriptions
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = platform_service_subscriptions.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = platform_service_subscriptions.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner','admin','operator']::text[])
  )
  or exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = platform_service_subscriptions.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = platform_service_subscriptions.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner','admin','operator']::text[])
  )
  or exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true
  )
);

create index if not exists partner_access_grants_accepted_user_id_idx
  on private.partner_access_grants (accepted_user_id)
  where accepted_user_id is not null;
create index if not exists partner_access_grants_created_by_idx
  on private.partner_access_grants (created_by);
