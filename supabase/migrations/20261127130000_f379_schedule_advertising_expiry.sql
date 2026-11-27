-- F3.79: schedule advertising expiry reconciliation where pg_cron is available.
do $schedule$
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    if exists(select 1 from pg_namespace where nspname='cron') then
      execute 'select cron.unschedule(jobid) from cron.job where jobname = ''mozempresas-advertising-expiry''';
      execute $job$
        select cron.schedule(
          'mozempresas-advertising-expiry',
          '*/15 * * * *',
          'select public.reconcile_advertising_campaign_expiry_f376();'
        )
      $job$;
    end if;
  else
    raise notice 'pg_cron is unavailable; advertising expiry reconciliation requires an external scheduler.';
  end if;
end;
$schedule$;
