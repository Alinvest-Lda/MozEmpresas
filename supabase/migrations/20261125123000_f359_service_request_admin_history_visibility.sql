-- F3.59: expose service-request lifecycle history to the Super Admin control plane.
drop policy if exists "service request participants read status history" on public.service_request_status_events;
create policy "service request participants read status history"
on public.service_request_status_events for select to authenticated
using (
  exists (
    select 1 from public.service_requests r
    where r.id = service_request_status_events.service_request_id
      and (
        r.requester_user_id = (select auth.uid())
        or exists (
          select 1 from public.businesses b
          where b.id = r.requester_business_id and b.owner_id = (select auth.uid())
        )
        or exists (
          select 1 from public.business_members bm
          where bm.business_id = r.requester_business_id
            and bm.user_id = (select auth.uid())
            and bm.role in ('owner','admin','operator')
        )
        or exists (
          select 1 from public.platform_members pm
          where pm.user_id = (select auth.uid())
            and pm.active = true and pm.role = 'super_admin'
        )
      )
  )
);
