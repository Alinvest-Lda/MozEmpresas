-- F3.21: route credit purchase state changes exclusively through the atomic admin RPC.
drop policy if exists "credit purchase platform read" on public.credit_purchase_requests;
drop policy if exists "credit purchase requester read" on public.credit_purchase_requests;
create policy "credit purchase authorized read"
on public.credit_purchase_requests
for select
to authenticated
using (
  requester_user_id = (select auth.uid())
  or exists (
    select 1 from public.businesses b
    where b.id = credit_purchase_requests.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.platform_members pm
    where pm.user_id = (select auth.uid())
      and pm.active = true
  )
);

drop policy if exists "credit purchase platform update" on public.credit_purchase_requests;
revoke update on table public.credit_purchase_requests from public, anon, authenticated;

drop policy if exists "business members read own service adjustments" on public.platform_service_adjustments;
drop policy if exists "super admins read service adjustments" on public.platform_service_adjustments;
create policy "authorized users read service adjustments"
on public.platform_service_adjustments
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = platform_service_adjustments.business_id
      and b.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.business_members bm
    where bm.business_id = platform_service_adjustments.business_id
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
