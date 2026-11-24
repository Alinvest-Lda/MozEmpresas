-- F3.57c: branch audit trigger by table before reading table-specific fields.
create or replace function public.capture_partner_relationship_audit()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_before jsonb; v_after jsonb; v_entity uuid; v_account uuid; v_action text; v_reason text;
begin
 if tg_op='DELETE' and tg_table_name='partner_accounts' then raise exception 'PARTNER_ACCOUNT_DELETE_FORBIDDEN' using errcode='23514'; end if;
 if tg_op='DELETE' then
  v_before:=to_jsonb(old);v_after:=null;v_entity:=old.id;v_action:='DELETED';
  if tg_table_name='partner_accounts' then v_account:=old.id; else v_account:=old.account_id; end if;
 elsif tg_op='INSERT' then
  v_before:=null;v_after:=to_jsonb(new);v_entity:=new.id;v_action:='CREATED';
  if tg_table_name='partner_accounts' then v_account:=new.id; else v_account:=new.account_id; end if;
 else
  v_before:=to_jsonb(old);v_after:=to_jsonb(new);v_entity:=new.id;
  if tg_table_name='partner_accounts' then
   v_account:=new.id;
   if old.status<>'SUSPENDED' and new.status='SUSPENDED' then v_action:='SUSPENDED';
   elsif old.status='SUSPENDED' and new.status='ACTIVE' then v_action:='REACTIVATED';
   elsif old.status<>'CLOSED' and new.status='CLOSED' then v_action:='CLOSED';
   else v_action:='UPDATED'; end if;
  else
   v_account:=new.account_id;
   if old.active and not new.active then v_action:='CONTACT_DEACTIVATED';
   elsif not old.active and new.active then v_action:='CONTACT_REACTIVATED';
   else v_action:='UPDATED'; end if;
  end if;
 end if;
 v_reason:=coalesce(nullif(current_setting('app.partner_change_reason',true),''),'Alteração administrativa registada');
 insert into public.partner_relationship_audit(entity_type,entity_id,account_id,actor_user_id,action,before_state,after_state,reason)
 values(case when tg_table_name='partner_accounts' then 'PARTNER_ACCOUNT' else 'PARTNER_CONTACT' end,v_entity,v_account,auth.uid(),v_action,v_before,v_after,v_reason);
 return null;
end $$;
revoke all on function public.capture_partner_relationship_audit() from public,anon,authenticated;
