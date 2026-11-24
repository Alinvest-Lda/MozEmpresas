-- F3.70: expire time-bound partner entitlements automatically.
create or replace function public.system_expire_partner_entitlements_f370()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_expired integer := 0;
begin
  update public.partner_entitlements
     set status='EXPIRED',updated_at=now()
   where status='ACTIVE'
     and ends_at is not null
     and ends_at < now();
  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;
revoke all on function public.system_expire_partner_entitlements_f370() from public,anon,authenticated;
grant execute on function public.system_expire_partner_entitlements_f370() to postgres,service_role;
do $$
begin
  if exists(select 1 from cron.job where jobname='mozempresas-auto-expire-partner-entitlements-f370') then
    perform cron.unschedule(jobid) from cron.job where jobname='mozempresas-auto-expire-partner-entitlements-f370';
  end if;
  perform cron.schedule('mozempresas-auto-expire-partner-entitlements-f370','*/15 * * * *','select public.system_expire_partner_entitlements_f370();');
end;
$$;
