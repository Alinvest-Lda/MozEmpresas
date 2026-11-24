
-- F3.41: close table-level privilege paths that bypass row-level security.
revoke truncate, references, trigger, maintain
  on all tables in schema public
  from anon, authenticated;

do $block$
declare r record;
begin
  for r in
    select n.nspname,c.relname
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind in ('r','p')
      and c.relrowsecurity
      and not exists (
        select 1 from pg_policy p
        where p.polrelid=c.oid
          and (0=any(p.polroles) or 'anon'::regrole::oid=any(p.polroles))
      )
  loop
    execute format('revoke all privileges on table %I.%I from anon',r.nspname,r.relname);
  end loop;
end;
$block$;

revoke create on schema public from anon, authenticated;
