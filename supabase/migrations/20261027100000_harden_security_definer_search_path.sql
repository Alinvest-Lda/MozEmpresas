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
  alter_kind text;
begin
  for routine in
    select
      p.oid::regprocedure as signature,
      p.prokind as routine_kind,
      (
        select substring(settings.setting from length('search_path=') + 1)
        from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
        where settings.setting like 'search_path=%'
        limit 1
      ) as configured_path,
      exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
        where settings.setting ~ '(^|,)[[:space:]]*pg_temp$'
      ) as has_pg_temp_last
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.prokind in ('f', 'p')
  loop
    if not routine.has_pg_temp_last then
      current_path := coalesce(nullif(trim(routine.configured_path), ''), 'public');
      current_path := regexp_replace(current_path, '(^|,)[[:space:]]*pg_temp[[:space:]]*(,|$)', '\1', 'gi');
      current_path := trim(both ', ' from current_path);
      alter_kind := case when routine.routine_kind = 'p' then 'procedure' else 'function' end;
      execute format(
        'alter %s %s set search_path = %s, pg_temp',
        alter_kind,
        routine.signature,
        coalesce(nullif(current_path, ''), 'public')
      );
    end if;
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.prokind in ('f', 'p')
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) as settings(setting)
        where settings.setting ~ '(^|,)[[:space:]]*pg_temp$'
      )
  ) then
    raise exception 'SECURITY DEFINER search_path hardening verification failed';
  end if;
end;
$migration$;
