create or replace function public.partner_access_list()
returns table (
  id uuid,
  email text,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not exists (
    select 1
    from public.platform_members pm
    where pm.user_id = auth.uid()
      and pm.active = true
      and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    g.id,
    g.email,
    case
      when g.status = 'PENDING' and g.expires_at <= now() then 'EXPIRED'
      else g.status
    end as status,
    g.created_at,
    g.expires_at,
    g.accepted_at
  from private.partner_access_grants g
  order by g.created_at desc
  limit 200;
end;
$$;

revoke all on function public.partner_access_list() from public, anon, authenticated;
grant execute on function public.partner_access_list() to authenticated;
