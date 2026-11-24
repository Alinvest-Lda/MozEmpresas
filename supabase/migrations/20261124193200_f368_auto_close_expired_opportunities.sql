-- F3.68: scheduled automatic closure of published opportunities past their deadline.
create extension if not exists pg_cron with schema pg_catalog;
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
    select id,null,'SYSTEM_AUTO_EXPIRED','PUBLISHED','CLOSED',now() from expired
    returning id
  )
  select count(*) into v_closed from expired;
  return v_closed;
end;
$$;
revoke all on function public.system_close_expired_opportunities_f368() from public,anon,authenticated;
grant execute on function public.system_close_expired_opportunities_f368() to postgres,service_role;
do $$
begin
  if exists(select 1 from cron.job where jobname='mozempresas-auto-close-expired-opportunities-f368') then
    perform cron.unschedule(jobid) from cron.job where jobname='mozempresas-auto-close-expired-opportunities-f368';
  end if;
  perform cron.schedule('mozempresas-auto-close-expired-opportunities-f368','*/15 * * * *','select public.system_close_expired_opportunities_f368();');
end;
$$;
