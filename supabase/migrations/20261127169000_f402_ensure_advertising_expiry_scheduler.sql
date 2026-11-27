-- F4.02: ensure the unified advertising expiry job is installed when pg_cron is available.
do $schedule$
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    if not exists(select 1 from pg_extension where extname='pg_cron') then
      execute 'create extension if not exists pg_cron';
    end if;

    if to_regclass('cron.job') is not null then
      execute 'select cron.unschedule(jobid) from cron.job where jobname = ''mozempresas-advertising-expiry''';
      execute $job$
        select cron.schedule(
          'mozempresas-advertising-expiry',
          '*/15 * * * *',
          'select public.reconcile_advertising_and_bank_transfer_expiry_f412();'
        )
      $job$;
    else
      raise notice 'pg_cron is installed but cron.job is unavailable; configure an external advertising expiry scheduler.';
    end if;
  else
    raise notice 'pg_cron is unavailable; advertising expiry reconciliation requires an external scheduler.';
  end if;
end;
$schedule$;
