-- F3.55: protect the last active Super Admin and revoke refresh sessions on self-service deactivation.
create or replace function public.request_own_account_status(p_status text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_user_id uuid:=auth.uid(); v_old_status text; v_action text; v_active_admins integer;
begin
 if v_user_id is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_status is null or p_status not in ('INACTIVE','DELETED') then raise exception 'INVALID_ACCOUNT_STATUS' using errcode='22023'; end if;
 select account_status into v_old_status from public.profiles where id=v_user_id for update;
 if not found then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 if v_old_status='DELETED' then raise exception 'DELETION_ALREADY_REQUESTED' using errcode='23514'; end if;
 if exists(select 1 from public.platform_members where user_id=v_user_id and active=true and role='super_admin') then
  select count(*) into v_active_admins from public.platform_members pm join public.profiles p on p.id=pm.user_id
  where pm.active=true and pm.role='super_admin' and p.account_status='ACTIVE';
  if v_active_admins<=1 then raise exception 'LAST_ACTIVE_SUPER_ADMIN_PROTECTED' using errcode='23514'; end if;
 end if;
 update public.profiles set account_status=p_status,
  deactivated_at=case when p_status='INACTIVE' then coalesce(deactivated_at,now()) else deactivated_at end,
  deletion_requested_at=case when p_status='DELETED' then coalesce(deletion_requested_at,now()) else deletion_requested_at end,
  updated_at=now() where id=v_user_id;
 delete from auth.sessions where user_id=v_user_id;
 v_action:=case when p_status='INACTIVE' then 'SELF_DEACTIVATED' else 'SELF_DELETION_REQUESTED' end;
 insert into public.account_admin_audit_log(actor_user_id,target_user_id,action,status_from,status_to)
 values(v_user_id,v_user_id,v_action,v_old_status,p_status);
 return jsonb_build_object('user_id',v_user_id,'status_from',v_old_status,'status_to',p_status);
end $$;
revoke all on function public.request_own_account_status(text) from public,anon;
grant execute on function public.request_own_account_status(text) to authenticated,service_role;
