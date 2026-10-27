-- Harden SECURITY DEFINER routines against temporary-schema object shadowing.
-- PostgreSQL can search pg_temp before ordinary schemas for relations/types unless
-- pg_temp is explicitly placed at the end of search_path. Preserve each routine's
-- existing schema path (notably public, private) and append pg_temp. This migration
-- intentionally does not change EXECUTE grants or RLS policies; those require
-- function-by-function authorization review and may be part of public workflows.

do $migration$
declare
  routine record;
  current_path text;
begin
  for routine in
    select
      p.oid::regprocedure as signature,
      (
        select substring(settings.setting from length('search_path=') + 1)
        from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
        where settings.setting like 'search_path=%'
        limit 1
      ) as configured_path,
      exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
        where settings.setting like 'search_path=%pg_temp%'
      ) as has_pg_temp
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    if not routine.has_pg_temp then
      current_path := coalesce(nullif(trim(routine.configured_path), ''), 'public');
      execute format(
        'alter function %s set search_path = %s, pg_temp',
        routine.signature,
        current_path
      );
    end if;
  end loop;
end;
$migration$;
