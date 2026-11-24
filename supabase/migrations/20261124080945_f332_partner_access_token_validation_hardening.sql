create or replace function public.partner_access_validate(p_token_hash text)
returns table(email text, expires_at timestamptz)
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  update private.partner_access_grants
  set status='EXPIRED'
  where token_hash=p_token_hash
    and status='PENDING'
    and expires_at<=now();

  return query
  select g.email,g.expires_at
  from private.partner_access_grants g
  where g.token_hash=p_token_hash
    and g.status='PENDING'
    and g.expires_at>now();
end;
$function$;

revoke all on function public.partner_access_validate(text) from public;
grant execute on function public.partner_access_validate(text) to anon, authenticated, service_role;
