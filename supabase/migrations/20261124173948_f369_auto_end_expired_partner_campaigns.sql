-- F3.69: end institutional ad campaigns automatically at their contracted end date.
create or replace function public.system_end_expired_partner_campaigns_f369()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_ended integer := 0;
begin
  with expired as (
    update public.partner_ad_campaigns
       set status='ENDED',updated_at=now()
     where status='ACTIVE'
       and ends_at is not null
       and ends_at < now()
    returning id,account_id
  ), events as (
    insert into public.partner_ad_campaign_status_events(campaign_id,account_id,old_status,new_status,event_type,actor_user_id,created_at)
    select id,account_id,'ACTIVE','ENDED','STATUS_CHANGED',null,now()
    from expired
    returning id
  )
  select count(*) into v_ended from expired;
  return v_ended;
end;
$$;
revoke all on function public.system_end_expired_partner_campaigns_f369() from public,anon,authenticated;
grant execute on function public.system_end_expired_partner_campaigns_f369() to postgres,service_role;
do $$
begin
  if exists(select 1 from cron.job where jobname='mozempresas-auto-end-expired-partner-campaigns-f369') then
    perform cron.unschedule(jobid) from cron.job where jobname='mozempresas-auto-end-expired-partner-campaigns-f369';
  end if;
  perform cron.schedule('mozempresas-auto-end-expired-partner-campaigns-f369','*/15 * * * *','select public.system_end_expired_partner_campaigns_f369();');
end;
$$;
