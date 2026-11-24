-- F3.68 correction: use the existing constrained lifecycle event type.
create or replace function public.system_close_expired_opportunities_f368()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_closed integer := 0;
begin
  with expired as (
    update public.opportunities
       set status = 'CLOSED', updated_at = now()
     where status = 'PUBLISHED' and closes_at is not null and closes_at < now()
    returning id
  ), events as (
    insert into public.opportunity_events(opportunity_id,actor_user_id,event_type,old_status,new_status,created_at)
    select id,null,'STATUS_CHANGED','PUBLISHED','CLOSED',now() from expired
    returning id
  )
  select count(*) into v_closed from expired;
  return v_closed;
end;
$$;
revoke all on function public.system_close_expired_opportunities_f368() from public,anon,authenticated;
grant execute on function public.system_close_expired_opportunities_f368() to postgres,service_role;
