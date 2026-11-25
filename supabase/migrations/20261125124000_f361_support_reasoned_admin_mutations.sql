-- F3.61: reason-required, atomic Super Admin support mutations.
alter table public.support_ticket_events
  add column if not exists action_reason text;

create or replace function public.capture_support_ticket_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(trim(current_setting('app.support_action_reason', true)), '');
begin
  if tg_op = 'INSERT' then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,new_status,new_priority,new_assigned_to)
    values(new.id,v_actor,'CREATED',new.status,new.priority,new.assigned_to);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_status,new_status,action_reason)
    values(new.id,v_actor,'STATUS_CHANGED',old.status,new.status,v_reason);
  end if;
  if new.priority is distinct from old.priority then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_priority,new_priority,action_reason)
    values(new.id,v_actor,'PRIORITY_CHANGED',old.priority,new.priority,v_reason);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.support_ticket_events(ticket_id,actor_user_id,event_type,old_assigned_to,new_assigned_to,action_reason)
    values(new.id,v_actor,case when new.assigned_to is null then 'UNASSIGNED' else 'ASSIGNED' end,old.assigned_to,new.assigned_to,v_reason);
  end if;
  return new;
end;
$function$;

create or replace function public.admin_set_support_ticket_assignee(
  p_ticket_id uuid, p_assignee_id uuid, p_reason text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_old uuid;
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_ticket_id is null or length(trim(coalesce(p_reason,''))) < 8 or length(trim(p_reason)) > 500 then
    raise exception 'INVALID_REASON_OR_TICKET';
  end if;
  if p_assignee_id is not null and not exists (
    select 1 from public.platform_members pm
    where pm.user_id=p_assignee_id and pm.active=true and pm.role='super_admin'
  ) then raise exception 'SUPPORT_ASSIGNEE_NOT_ACTIVE_SUPER_ADMIN'; end if;
  select assigned_to into v_old from public.support_tickets where id=p_ticket_id for update;
  if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;
  if v_old is not distinct from p_assignee_id then raise exception 'SUPPORT_ASSIGNMENT_UNCHANGED'; end if;
  perform set_config('app.support_action_reason',trim(p_reason),true);
  update public.support_tickets set assigned_to=p_assignee_id,updated_at=now() where id=p_ticket_id;
end;
$function$;

create or replace function public.admin_set_support_ticket_status(
  p_ticket_id uuid, p_status text, p_reason text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_old text; v_allowed boolean := false;
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_ticket_id is null or length(trim(coalesce(p_reason,''))) < 8 or length(trim(p_reason)) > 500 then
    raise exception 'INVALID_REASON_OR_TICKET';
  end if;
  select status into v_old from public.support_tickets where id=p_ticket_id for update;
  if not found then raise exception 'SUPPORT_TICKET_NOT_FOUND'; end if;
  v_allowed := case v_old
    when 'OPEN' then p_status in ('IN_PROGRESS','WAITING_USER','RESOLVED','CLOSED')
    when 'IN_PROGRESS' then p_status in ('WAITING_USER','RESOLVED','CLOSED','OPEN')
    when 'WAITING_USER' then p_status in ('IN_PROGRESS','RESOLVED','CLOSED','OPEN')
    when 'RESOLVED' then p_status in ('IN_PROGRESS','CLOSED')
    when 'CLOSED' then false
    else false
  end;
  if not v_allowed then raise exception 'INVALID_SUPPORT_STATUS_TRANSITION'; end if;
  perform set_config('app.support_action_reason',trim(p_reason),true);
  update public.support_tickets
  set status=p_status,closed_at=case when p_status='CLOSED' then now() else null end,updated_at=now()
  where id=p_ticket_id;
end;
$function$;

revoke all on function public.admin_set_support_ticket_assignee(uuid,uuid,text) from public,anon;
revoke all on function public.admin_set_support_ticket_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_support_ticket_assignee(uuid,uuid,text) to authenticated;
grant execute on function public.admin_set_support_ticket_status(uuid,text,text) to authenticated;
