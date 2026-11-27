-- F3.80: consolidate legacy partner-only expiry cron into the unified advertising reconciler.
create or replace function public.system_end_expired_partner_campaigns_f369()
returns integer
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $$
declare
  v_result jsonb;
begin
  v_result:=public.reconcile_advertising_campaign_expiry_f376();
  return coalesce((v_result->>'partner_campaigns_ended')::integer,0);
end;
$$;
revoke all on function public.system_end_expired_partner_campaigns_f369() from public,anon,authenticated;
grant execute on function public.system_end_expired_partner_campaigns_f369() to postgres,service_role;

do $$
begin
  if exists(select 1 from pg_namespace where nspname='cron') then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''mozempresas-auto-end-expired-partner-campaigns-f369''';
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''mozempresas-advertising-expiry''';
    execute $job$
      select cron.schedule(
        'mozempresas-advertising-expiry',
        '*/15 * * * *',
        'select public.reconcile_advertising_campaign_expiry_f376();'
      )
    $job$;
  end if;
end;
$$;
