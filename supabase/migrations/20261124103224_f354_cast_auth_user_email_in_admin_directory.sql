-- F3.54: cast auth.users.email to the declared text return type.
create or replace function public.admin_list_platform_users(
 p_search text default null,p_user_type text default null,p_status text default null,
 p_access text default null,p_association text default null,p_limit integer default 30,p_offset integer default 0
)
returns table(id uuid,email text,full_name text,user_type text,account_status text,created_at timestamptz,
 deactivated_at timestamptz,deletion_requested_at timestamptz,platform_role text,platform_active boolean,businesses jsonb,total_count bigint)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return query
 with base as (
  select p.id,u.email::text as email,p.full_name,p.user_type,p.account_status,p.created_at,p.deactivated_at,p.deletion_requested_at,
   pm.role as platform_role,pm.active as platform_active,
   coalesce((select jsonb_agg(jsonb_build_object('name',x.name,'role',x.role) order by x.name) from (
    select b.name,'owner'::text role from public.businesses b where b.owner_id=p.id and b.archived_at is null
    union all select b.name,bm.role from public.business_members bm join public.businesses b on b.id=bm.business_id where bm.user_id=p.id and b.archived_at is null
   ) x),'[]'::jsonb) businesses
  from public.profiles p join auth.users u on u.id=p.id left join public.platform_members pm on pm.user_id=p.id
 ), filtered as (
  select b.* from base b
  where (nullif(trim(p_search),'') is null or lower(coalesce(b.full_name,'')||' '||coalesce(b.email,'')) like '%'||lower(trim(p_search))||'%')
   and (p_user_type is null or b.user_type=p_user_type) and (p_status is null or b.account_status=p_status)
   and (p_access is null or (p_access='admin_activo' and b.platform_active=true) or (p_access='admin_inactivo' and b.platform_active=false) or (p_access='sem_admin' and b.platform_role is null))
   and (p_association is null or (p_association='com_empresa' and jsonb_array_length(b.businesses)>0) or (p_association='sem_empresa' and jsonb_array_length(b.businesses)=0))
 )
 select f.id,f.email,f.full_name,f.user_type,f.account_status,f.created_at,f.deactivated_at,f.deletion_requested_at,f.platform_role,f.platform_active,f.businesses,count(*) over()
 from filtered f order by f.created_at desc limit greatest(1,least(coalesce(p_limit,30),100)) offset greatest(coalesce(p_offset,0),0);
end $$;
revoke all on function public.admin_list_platform_users(text,text,text,text,text,integer,integer) from public,anon;
grant execute on function public.admin_list_platform_users(text,text,text,text,text,integer,integer) to authenticated;
