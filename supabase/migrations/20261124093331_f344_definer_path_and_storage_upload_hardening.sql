-- F3.44: complete privileged routine path hardening and enforce storage upload limits.
-- Keep each existing trusted schema in order, but put pg_temp last so callers
-- cannot shadow names used by SECURITY DEFINER routines with temporary objects.
do $hardening$
declare
  r record;
  v_path text;
  v_quoted_path text;
begin
  for r in
    select p.oid,p.prokind,p.oid::regprocedure::text as signature,
      coalesce((
        select split_part(setting,'=',2)
        from unnest(p.proconfig) setting
        where setting like 'search_path=%'
        limit 1
      ),'public') as configured_path
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and not exists (
        select 1 from unnest(coalesce(p.proconfig,array[]::text[])) setting
        where setting like 'search_path=%'
          and setting ~ '(^|,\\s*)pg_temp(\\s*,|$)'
      )
  loop
    v_path := regexp_replace(r.configured_path,'\\s*,\\s*',',','g');
    select string_agg(format('%I',trim(part)),', ' order by ord)
      into v_quoted_path
    from unnest(string_to_array(v_path,',')) with ordinality as parts(part,ord);
    v_quoted_path := v_quoted_path || ', pg_temp';

    if r.prokind='p' then
      execute format('alter procedure %s set search_path to %s',r.signature,v_quoted_path);
    else
      execute format('alter function %s set search_path to %s',r.signature,v_quoted_path);
    end if;
  end loop;
end;
$hardening$;

-- Storage-level controls complement application-side content-signature checks.
update storage.buckets
set file_size_limit=10485760,
    allowed_mime_types=array[
      'image/jpeg','image/png','image/webp',
      'application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
where id='listing-media';

update storage.buckets
set file_size_limit=10485760,
    allowed_mime_types=array[
      'image/jpeg','image/png','image/webp','application/pdf'
    ]
where id='payment-proofs';
