-- F3.65: reasoned Super Admin quote/status decisions with atomic before/after audit.
create table if not exists public.service_request_admin_events (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('STATUS_CHANGED','QUOTE_UPDATED')),
  old_status text,
  new_status text,
  old_requested_price numeric(14,2),
  new_requested_price numeric(14,2),
  action_reason text not null check (length(trim(action_reason)) between 8 and 500),
  created_at timestamptz not null default now()
);
create index if not exists service_request_admin_events_request_created_idx
  on public.service_request_admin_events(service_request_id,created_at desc);
alter table public.service_request_admin_events enable row level security;
revoke all on public.service_request_admin_events from public,anon,authenticated;
grant select on public.service_request_admin_events to authenticated;
create policy "service request admin events super admin read"
on public.service_request_admin_events for select to authenticated
using (exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));

create or replace function public.admin_update_service_request(
  p_request_id uuid, p_status text, p_requested_price numeric, p_reason text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_request public.service_requests; v_type text;
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_request_id is null or p_status is null or length(trim(coalesce(p_reason,'')))<8 or length(trim(p_reason))>500 then
    raise exception 'INVALID_SERVICE_REQUEST_ADMIN_ACTION';
  end if;
  if p_requested_price is not null and (p_requested_price<=0 or p_requested_price>100000000) then
    raise exception 'INVALID_SERVICE_REQUEST_PRICE';
  end if;
  select * into v_request from public.service_requests where id=p_request_id for update;
  if not found then raise exception 'SERVICE_REQUEST_NOT_FOUND'; end if;
  if p_status is distinct from v_request.status and p_status not in (
    case v_request.status when 'REQUESTED' then 'UNDER_REVIEW' when 'UNDER_REVIEW' then 'QUOTED'
    when 'QUOTED' then 'ACCEPTED' when 'ACCEPTED' then 'IN_PROGRESS'
    when 'IN_PROGRESS' then 'COMPLETED' else null end,
    'CANCELLED'
  ) then raise exception 'INVALID_SERVICE_REQUEST_TRANSITION'; end if;
  if p_status is not distinct from v_request.status and p_requested_price is not distinct from v_request.requested_price then
    raise exception 'SERVICE_REQUEST_UNCHANGED';
  end if;
  v_type := case when p_status is distinct from v_request.status then 'STATUS_CHANGED' else 'QUOTE_UPDATED' end;
  update public.service_requests
  set status=p_status,requested_price=p_requested_price,updated_at=now()
  where id=p_request_id;
  insert into public.service_request_admin_events(
    service_request_id,actor_user_id,event_type,old_status,new_status,
    old_requested_price,new_requested_price,action_reason
  ) values (
    p_request_id,auth.uid(),v_type,v_request.status,p_status,
    v_request.requested_price,p_requested_price,trim(p_reason)
  );
end;
$function$;
revoke all on function public.admin_update_service_request(uuid,text,numeric,text) from public,anon;
grant execute on function public.admin_update_service_request(uuid,text,numeric,text) to authenticated;
