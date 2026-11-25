-- F3.57: full staff governance directory, including inactive members for restoration.
create or replace function public.admin_list_platform_staff_governance()
returns table(user_id uuid, full_name text, role text, active boolean)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id = auth.uid() and pm.active = true and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  select pm.user_id,
    coalesce(nullif(trim(p.full_name), ''), split_part(u.email, '@', 1)) as full_name,
    pm.role,
    pm.active
  from public.platform_members pm
  left join public.profiles p on p.id = pm.user_id
  left join auth.users u on u.id = pm.user_id
  order by pm.active desc, pm.role, full_name;
end;
$$;
revoke all on function public.admin_list_platform_staff_governance() from public, anon;
grant execute on function public.admin_list_platform_staff_governance() to authenticated;
