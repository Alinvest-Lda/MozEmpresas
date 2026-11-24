-- F3.58c: grant only the DML required by guarded institutional backoffice actions.
grant insert on public.partner_accounts to authenticated;
grant select,insert,update on public.partner_entitlements to authenticated;
