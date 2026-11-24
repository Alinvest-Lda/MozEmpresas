
-- F3.40: attach account-governance notifications to the canonical audit stream.
drop trigger if exists platform_account_governance_notification on public.platform_account_audit_log;
drop trigger if exists platform_account_audit_immutable on public.platform_account_audit_log;
drop function if exists public.notify_platform_account_governance_event();
drop function if exists public.prevent_platform_account_audit_mutation();
drop table if exists public.platform_account_audit_log;

create or replace function public.notify_account_admin_audit_event()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_title text;
  v_body text;
  v_reason text:=nullif(left(coalesce(new.metadata->>'reason',''),300),'');
begin
  if new.target_user_id is null
     or new.actor_user_id is null
     or new.target_user_id=new.actor_user_id
     or new.action not in (
       'ADMIN_SUSPENDED','ADMIN_REACTIVATED','ADMIN_DELETION_REQUESTED',
       'ADMIN_DELETION_REQUEST_CANCELLED','ADMIN_PASSWORD_RECOVERY_REQUESTED'
     ) then
    return new;
  end if;

  case new.action
    when 'ADMIN_SUSPENDED' then
      v_title:='Acesso à conta suspenso';
      v_body:='O acesso à sua conta foi suspenso pela administração. Motivo: '||coalesce(v_reason,'não especificado')||'. Contacte o suporte se precisar de esclarecimentos.';
    when 'ADMIN_REACTIVATED' then
      v_title:='Conta reactivada';
      v_body:='A administração reactivou a sua conta. Já pode voltar a aceder às funcionalidades autorizadas.';
    when 'ADMIN_DELETION_REQUESTED' then
      v_title:='Pedido de eliminação da conta';
      v_body:='A administração registou um pedido de eliminação para a sua conta. Motivo: '||coalesce(v_reason,'não especificado')||'. Contacte o suporte se precisar de esclarecimentos.';
    when 'ADMIN_DELETION_REQUEST_CANCELLED' then
      v_title:='Pedido de eliminação cancelado';
      v_body:='A administração cancelou o pedido de eliminação da sua conta.';
    when 'ADMIN_PASSWORD_RECOVERY_REQUESTED' then
      v_title:='Recuperação de password solicitada';
      v_body:='A administração iniciou um pedido de recuperação de password para a sua conta. Se não reconhece esta acção, contacte o suporte.';
    else return new;
  end case;

  insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
  values(new.target_user_id,'ACCOUNT_GOVERNANCE',v_title,v_body,'ACCOUNT',new.target_user_id);
  return new;
end;
$function$;
revoke all on function public.notify_account_admin_audit_event() from public,anon,authenticated;
drop trigger if exists account_admin_audit_notification on public.account_admin_audit_log;
create trigger account_admin_audit_notification
after insert on public.account_admin_audit_log
for each row execute function public.notify_account_admin_audit_event();
