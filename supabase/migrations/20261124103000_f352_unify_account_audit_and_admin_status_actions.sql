-- F3.52: use the original account_admin_audit_log as the single account audit stream.
alter table public.account_admin_audit_log
  drop constraint if exists account_admin_audit_log_action_check;
alter table public.account_admin_audit_log
  add constraint account_admin_audit_log_action_check
  check (action in (
    'SELF_DEACTIVATED','SELF_DELETION_REQUESTED','ADMIN_SUSPENDED','ADMIN_REACTIVATED',
    'ADMIN_DELETION_REQUESTED','ADMIN_DELETION_REQUEST_CANCELLED','ADMIN_PASSWORD_RECOVERY_REQUESTED'
  ));

create or replace function public.admin_set_account_status(p_user_id uuid,p_status text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_old text; v_active_admins integer; v_target_is_admin boolean;
 v_reason text:=nullif(left(trim(coalesce(p_reason,'')),500),''); v_action text;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then
   raise exception 'FORBIDDEN' using errcode='42501'; end if;
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
 v_action:=case when p_status='ACTIVE' then 'ADMIN_REACTIVATED' when p_status='INACTIVE' then 'ADMIN_SUSPENDED' else 'ADMIN_DELETION_REQUESTED' end;
 insert into public.account_admin_audit_log(actor_user_id,target_user_id,action,status_from,status_to,metadata)
 values(v_actor,p_user_id,v_action,v_old,p_status,jsonb_build_object('reason',v_reason));
 return jsonb_build_object('user_id',p_user_id,'previous_status',v_old,'new_status',p_status);
end $$;
revoke all on function public.admin_set_account_status(uuid,text,text) from public,anon;
grant execute on function public.admin_set_account_status(uuid,text,text) to authenticated;

create or replace function public.admin_record_password_recovery(p_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then
   raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 insert into public.account_admin_audit_log(actor_user_id,target_user_id,action,status_from,status_to,metadata)
 values(v_actor,p_user_id,'ADMIN_PASSWORD_RECOVERY_REQUESTED',null,null,jsonb_build_object('reason','Pedido de recuperação de password iniciado pelo Super Admin.'));
end $$;
revoke all on function public.admin_record_password_recovery(uuid) from public,anon;
grant execute on function public.admin_record_password_recovery(uuid) to authenticated;

drop function if exists public.request_own_account_status(text,text);
drop table if exists public.platform_account_audit_log cascade;
drop function if exists public.prevent_platform_account_audit_mutation();
