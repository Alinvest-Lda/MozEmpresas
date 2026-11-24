-- F3.53: Super Admin user directory, account audit access, and refresh-session revocation.
create or replace function public.admin_list_platform_users(
 p_search text default null,p_user_type text default null,p_status text default null,
 p_access text default null,p_association text default null,p_limit integer default 30,p_offset integer default 0
)
returns table(id uuid,email text,full_name text,user_type text,account_status text,created_at timestamptz,
 deactivated_at timestamptz,deletion_requested_at timestamptz,platform_role text,platform_active boolean,businesses jsonb,total_count bigint)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then
   raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return query
 with base as (
  select p.id,u.email,p.full_name,p.user_type,p.account_status,p.created_at,p.deactivated_at,p.deletion_requested_at,
   pm.role as platform_role,pm.active as platform_active,
   coalesce((select jsonb_agg(jsonb_build_object('name',x.name,'role',x.role) order by x.name) from (
    select b.name,'owner'::text role from public.businesses b where b.owner_id=p.id and b.archived_at is null
    union all
    select b.name,bm.role from public.business_members bm join public.businesses b on b.id=bm.business_id where bm.user_id=p.id and b.archived_at is null
   ) x),'[]'::jsonb) businesses
  from public.profiles p join auth.users u on u.id=p.id left join public.platform_members pm on pm.user_id=p.id
 ), filtered as (
  select b.* from base b
  where (nullif(trim(p_search),'') is null or lower(coalesce(b.full_name,'')||' '||coalesce(b.email,'')) like '%'||lower(trim(p_search))||'%')
   and (p_user_type is null or b.user_type=p_user_type)
   and (p_status is null or b.account_status=p_status)
   and (p_access is null or (p_access='admin_activo' and b.platform_active=true) or (p_access='admin_inactivo' and b.platform_active=false) or (p_access='sem_admin' and b.platform_role is null))
   and (p_association is null or (p_association='com_empresa' and jsonb_array_length(b.businesses)>0) or (p_association='sem_empresa' and jsonb_array_length(b.businesses)=0))
 )
 select f.id,f.email,f.full_name,f.user_type,f.account_status,f.created_at,f.deactivated_at,f.deletion_requested_at,
  f.platform_role,f.platform_active,f.businesses,count(*) over()
 from filtered f order by f.created_at desc limit greatest(1,least(coalesce(p_limit,30),100)) offset greatest(coalesce(p_offset,0),0);
end $$;
revoke all on function public.admin_list_platform_users(text,text,text,text,text,integer,integer) from public,anon;
grant execute on function public.admin_list_platform_users(text,text,text,text,text,integer,integer) to authenticated;

create or replace function public.admin_list_account_audit(p_limit integer default 50)
returns table(id uuid,actor_user_id uuid,target_user_id uuid,action text,status_from text,status_to text,metadata jsonb,created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then
  raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return query select a.id,a.actor_user_id,a.target_user_id,a.action,a.status_from,a.status_to,a.metadata,a.created_at
 from public.account_admin_audit_log a order by a.created_at desc limit greatest(1,least(coalesce(p_limit,50),100));
end $$;
revoke all on function public.admin_list_account_audit(integer) from public,anon;
grant execute on function public.admin_list_account_audit(integer) to authenticated;

create or replace function public.admin_get_user_email(p_user_id uuid)
returns text language plpgsql stable security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_email text;
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then
  raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select u.email into v_email from auth.users u join public.profiles p on p.id=u.id where u.id=p_user_id;
 if v_email is null then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 return v_email;
end $$;
revoke all on function public.admin_get_user_email(uuid) from public,anon;
grant execute on function public.admin_get_user_email(uuid) to authenticated;

create or replace function public.admin_set_account_status(p_user_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_old text; v_active_admins integer; v_target_is_admin boolean;
 v_reason text:=nullif(left(trim(coalesce(p_reason,'')),500),''); v_action text;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_user_id is null or p_user_id=v_actor then raise exception 'SELF_ACCOUNT_CHANGE_FORBIDDEN' using errcode='42501'; end if;
 if p_status is null or p_status not in ('ACTIVE','INACTIVE','DELETED') then raise exception 'INVALID_ACCOUNT_STATUS' using errcode='22023'; end if;
 if length(coalesce(v_reason,''))<8 then raise exception 'REASON_REQUIRED' using errcode='22023'; end if;
 select account_status into v_old from public.profiles where id=p_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 select exists(select 1 from public.platform_members where user_id=p_user_id and active=true and role='super_admin') into v_target_is_admin;
 if v_target_is_admin and p_status<>'ACTIVE' then
  select count(*) into v_active_admins from public.platform_members pm join public.profiles p on p.id=pm.user_id
  where pm.active=true and pm.role='super_admin' and p.account_status='ACTIVE';
  if v_active_admins<=1 then raise exception 'LAST_ACTIVE_SUPER_ADMIN_PROTECTED' using errcode='23514'; end if;
 end if;
 if v_old=p_status then raise exception 'ACCOUNT_STATUS_UNCHANGED' using errcode='23514'; end if;
 update public.profiles set account_status=p_status,
  deactivated_at=case when p_status='INACTIVE' then coalesce(deactivated_at,now()) when p_status='ACTIVE' then null else deactivated_at end,
  deletion_requested_at=case when p_status='DELETED' then coalesce(deletion_requested_at,now()) when p_status='ACTIVE' then null else deletion_requested_at end,
  updated_at=now() where id=p_user_id;
 if p_status<>'ACTIVE' then delete from auth.sessions where user_id=p_user_id; end if;
 v_action:=case when p_status='ACTIVE' then 'ADMIN_REACTIVATED' when p_status='INACTIVE' then 'ADMIN_SUSPENDED' else 'ADMIN_DELETION_REQUESTED' end;
 insert into public.account_admin_audit_log(actor_user_id,target_user_id,action,status_from,status_to,metadata)
 values(v_actor,p_user_id,v_action,v_old,p_status,jsonb_build_object('reason',v_reason));
 return jsonb_build_object('user_id',p_user_id,'previous_status',v_old,'new_status',p_status);
end $$;
revoke all on function public.admin_set_account_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_account_status(uuid,text,text) to authenticated;
