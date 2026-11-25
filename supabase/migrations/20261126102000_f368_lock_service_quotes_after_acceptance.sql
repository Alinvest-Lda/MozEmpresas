-- F3.68: prevent administrative quote changes after requester acceptance.
create or replace function public.admin_update_service_request(
  p_request_id uuid, p_status text, p_requested_price numeric, p_reason text
) returns void
language plpgsql security definer
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
  if p_status is distinct from v_request.status and not (
    case v_request.status
      when 'REQUESTED' then p_status in ('UNDER_REVIEW','CANCELLED')
      when 'UNDER_REVIEW' then p_status in ('QUOTED','ACCEPTED','CANCELLED')
      when 'QUOTED' then p_status in ('ACCEPTED','CANCELLED')
      when 'ACCEPTED' then p_status in ('IN_PROGRESS','CANCELLED')
      when 'IN_PROGRESS' then p_status in ('COMPLETED','CANCELLED')
      else false
    end
  ) then raise exception 'INVALID_SERVICE_REQUEST_TRANSITION'; end if;
  if p_requested_price is distinct from v_request.requested_price
    and p_status not in ('REQUESTED','UNDER_REVIEW','QUOTED') then
    raise exception 'SERVICE_REQUEST_QUOTE_LOCKED';
  end if;
  if p_status is not distinct from v_request.status and p_requested_price is not distinct from v_request.requested_price then
    raise exception 'SERVICE_REQUEST_UNCHANGED';
  end if;
  v_type := case when p_status is distinct from v_request.status then 'STATUS_CHANGED' else 'QUOTE_UPDATED' end;
  update public.service_requests set status=p_status,requested_price=p_requested_price,updated_at=now()
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
