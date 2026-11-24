create or replace function public.admin_record_password_recovery(p_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then
   raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'PROFILE_NOT_FOUND' using errcode='P0002'; end if;
 insert into public.platform_account_audit_log(actor_user_id,target_user_id,action,reason)
 values(v_actor,p_user_id,'PASSWORD_RECOVERY_REQUESTED','Pedido de recuperação de password iniciado pelo Super Admin.');
end $$;
revoke all on function public.admin_record_password_recovery(uuid) from public,anon;
grant execute on function public.admin_record_password_recovery(uuid) to authenticated;