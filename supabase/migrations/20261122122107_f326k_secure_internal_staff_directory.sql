
create or replace function public.admin_list_platform_staff()
returns table(user_id uuid,full_name text,role text,active boolean)
language plpgsql stable security definer set search_path=public,auth as $$
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 return query
 select pm.user_id,coalesce(nullif(trim(p.full_name),''),split_part(u.email,'@',1)) as full_name,pm.role,pm.active
 from public.platform_members pm
 left join public.profiles p on p.id=pm.user_id
 left join auth.users u on u.id=pm.user_id
 where pm.active=true order by pm.role,full_name;
end; $$;
revoke all on function public.admin_list_platform_staff() from public,anon;
grant execute on function public.admin_list_platform_staff() to authenticated;
