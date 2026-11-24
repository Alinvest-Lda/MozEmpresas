-- F3.58e: automatically suspend active partner entitlements when the institutional relationship is suspended or closed.
create or replace function public.suspend_partner_entitlements_on_account_hold()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_reason text;
begin
 if new.status in ('SUSPENDED','CLOSED') and old.status is distinct from new.status then
  v_reason:=coalesce(nullif(trim(current_setting('app.partner_change_reason',true)),''),'Suspensão automática por alteração do estado da entidade');
  perform set_config('app.partner_change_reason',v_reason,true);
  update public.partner_entitlements set status='SUSPENDED',updated_at=now()
   where account_id=new.id and status='ACTIVE';
 end if;
 return null;
end $$;
revoke all on function public.suspend_partner_entitlements_on_account_hold() from public,anon,authenticated;
drop trigger if exists partner_accounts_suspend_entitlements on public.partner_accounts;
create trigger partner_accounts_suspend_entitlements after update of status on public.partner_accounts
for each row execute function public.suspend_partner_entitlements_on_account_hold();
