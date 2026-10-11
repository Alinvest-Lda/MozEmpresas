create or replace function public.current_partner_opportunity_role()
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select m.role
  from public.partner_account_members m
  join public.partner_accounts a on a.id = m.account_id
  join public.profiles p on p.id = m.user_id
  where m.user_id = auth.uid()
    and m.account_id = (select public.current_partner_account_id())
    and m.active = true
    and a.status = 'ACTIVE'
    and p.user_type = 'parceiro'
    and coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
  limit 1
$function$;

revoke all on function public.current_partner_opportunity_role() from anon;
revoke all on function public.current_partner_opportunity_role() from public;
grant execute on function public.current_partner_opportunity_role() to authenticated;
