
-- F3.37: account governance and partner access notification lifecycle.
create table if not exists public.platform_account_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('ACCOUNT_SUSPENDED','ACCOUNT_REACTIVATED','ACCOUNT_DELETION_REQUESTED','ACCOUNT_DELETION_REVIEWED','PASSWORD_RECOVERY_REQUESTED')),
  previous_status text, new_status text, reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_account_audit_target_created_idx on public.platform_account_audit_log(target_user_id,created_at desc);
create index if not exists platform_account_audit_actor_created_idx on public.platform_account_audit_log(actor_user_id,created_at desc);
alter table public.platform_account_audit_log enable row level security;
revoke all on public.platform_account_audit_log from public,anon,authenticated;
grant select on public.platform_account_audit_log to authenticated;
drop policy if exists platform_account_audit_super_admin_read on public.platform_account_audit_log;
create policy platform_account_audit_super_admin_read on public.platform_account_audit_log for select to authenticated using (exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));
create or replace function public.prevent_platform_account_audit_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$ begin raise exception 'PLATFORM_ACCOUNT_AUDIT_IMMUTABLE'; end $$;
revoke all on function public.prevent_platform_account_audit_mutation() from public,anon,authenticated;
drop trigger if exists platform_account_audit_immutable on public.platform_account_audit_log;
create trigger platform_account_audit_immutable before update or delete on public.platform_account_audit_log for each row execute function public.prevent_platform_account_audit_mutation();

create or replace function public.notify_platform_account_governance_event()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $function$
declare v_title text; v_body text;
begin
 if new.target_user_id is null or new.actor_user_id is null or new.target_user_id=new.actor_user_id then return new; end if;
 case new.action
  when 'ACCOUNT_SUSPENDED' then v_title:='Acesso à conta suspenso'; v_body:='O acesso à sua conta foi suspenso pela administração. Motivo: '||coalesce(nullif(left(new.reason,300),''),'não especificado')||'. Contacte o suporte se precisar de esclarecimentos.';
  when 'ACCOUNT_REACTIVATED' then v_title:='Conta reactivada'; v_body:='A administração reactivou a sua conta. Já pode voltar a aceder às funcionalidades autorizadas.';
  when 'ACCOUNT_DELETION_REVIEWED' then v_title:=case when new.new_status='DELETED' then 'Pedido de eliminação analisado' else 'Estado da conta actualizado' end; v_body:='A administração actualizou o estado do seu pedido para "'||coalesce(new.new_status,'—')||'". Motivo: '||coalesce(nullif(left(new.reason,300),''),'não especificado')||'.';
  when 'PASSWORD_RECOVERY_REQUESTED' then v_title:='Recuperação de password solicitada'; v_body:='A administração iniciou um pedido de recuperação de password para a sua conta. Se não reconhece esta acção, contacte o suporte.';
  else return new;
 end case;
 insert into public.notifications(user_id,type,title,body,resource_type,resource_id) values(new.target_user_id,'ACCOUNT_GOVERNANCE',v_title,v_body,'ACCOUNT',new.target_user_id);
 return new;
end;
$function$;
revoke all on function public.notify_platform_account_governance_event() from public,anon,authenticated;
drop trigger if exists platform_account_governance_notification on public.platform_account_audit_log;
create trigger platform_account_governance_notification after insert on public.platform_account_audit_log for each row execute function public.notify_platform_account_governance_event();

create or replace function public.admin_partner_access_revoke(p_member_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path to public,auth,pg_temp as $function$
declare v_member public.partner_account_members%rowtype; v_account_name text;
begin
 if auth.uid() is null or not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if p_member_id is null or p_reason is null or length(trim(p_reason))<8 or length(trim(p_reason))>500 then raise exception 'INVALID_ACCESS_REVOCATION'; end if;
 select m.* into v_member from public.partner_account_members m where m.id=p_member_id and m.active=true for update;
 if v_member.id is null then raise exception 'PARTNER_ACCESS_NOT_FOUND'; end if;
 select a.name into v_account_name from public.partner_accounts a where a.id=v_member.account_id for update;
 update public.partner_account_members set active=false,updated_at=now() where id=v_member.id and active=true;
 if not found then raise exception 'PARTNER_ACCESS_CHANGED'; end if;
 insert into public.partner_relationship_audit(entity_type,entity_id,account_id,actor_user_id,action,before_state,after_state,reason)
 values('PARTNER_ACCOUNT',v_member.account_id,v_member.account_id,auth.uid(),'ACCESS_REVOKED',jsonb_build_object('member_id',v_member.id,'user_id',v_member.user_id,'role',v_member.role,'active',true),jsonb_build_object('member_id',v_member.id,'user_id',v_member.user_id,'role',v_member.role,'active',false),trim(p_reason));
 insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
 values(v_member.user_id,'PARTNER_ACCESS_REVOKED','Acesso de parceiro revogado','O acesso à organização "'||left(coalesce(v_account_name,'Parceiro'),120)||'" foi revogado pela administração. Motivo: '||left(trim(p_reason),300)||'. Contacte o suporte para esclarecimentos.','PARTNER_ACCOUNT',v_member.account_id);
 return true;
end;
$function$;
revoke all on function public.admin_partner_access_revoke(uuid,text) from public,anon;
grant execute on function public.admin_partner_access_revoke(uuid,text) to authenticated,service_role;
