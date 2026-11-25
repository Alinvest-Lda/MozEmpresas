-- F3.63: mandatory reason and atomic audit for Super Admin opportunity moderation.
alter table public.opportunity_events add column if not exists action_reason text;

create or replace function public.capture_opportunity_lifecycle_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if tg_op='INSERT' then
    insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,new_status)
    values(new.id,auth.uid(),'CREATED',new.status::text);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,old_status,new_status,action_reason)
    values(new.id,auth.uid(),'STATUS_CHANGED',old.status::text,new.status::text,
      nullif(trim(current_setting('app.opportunity_moderation_reason',true)),''));
  end if;
  return new;
end;
$function$;

create or replace function public.admin_set_opportunity_status(
  p_opportunity_id uuid, p_new_status text, p_reason text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_opportunity public.opportunities; v_allowed boolean := false;
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_opportunity_id is null or p_new_status not in ('DRAFT','PUBLISHED','CLOSED','ARCHIVED')
    or length(trim(coalesce(p_reason,''))) < 8 or length(trim(p_reason)) > 500 then
    raise exception 'INVALID_OPPORTUNITY_MODERATION';
  end if;
  select * into v_opportunity from public.opportunities where id=p_opportunity_id for update;
  if not found then raise exception 'OPPORTUNITY_NOT_FOUND'; end if;
  v_allowed := case v_opportunity.status::text
    when 'DRAFT' then p_new_status='PUBLISHED'
    when 'PUBLISHED' then p_new_status in ('CLOSED','ARCHIVED')
    when 'CLOSED' then p_new_status in ('PUBLISHED','ARCHIVED')
    when 'ARCHIVED' then p_new_status='DRAFT'
    else false
  end;
  if not v_allowed then raise exception 'INVALID_OPPORTUNITY_STATUS_TRANSITION'; end if;
  perform set_config('app.opportunity_moderation_reason',trim(p_reason),true);
  update public.opportunities set status=p_new_status,updated_at=now() where id=p_opportunity_id;
end;
$function$;
revoke all on function public.admin_set_opportunity_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_opportunity_status(uuid,text,text) to authenticated;
