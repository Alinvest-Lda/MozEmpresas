-- Enforce the single-active-partner-membership rule and fail closed on ambiguous context.
-- Applied to the production Supabase project on 2026-11-01.

create unique index if not exists partner_account_members_one_active_user_uidx
  on public.partner_account_members (user_id)
  where active = true;

create or replace function public.current_partner_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  with eligible as (
    select m.account_id
    from public.partner_account_members m
    join public.partner_accounts a on a.id = m.account_id
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and auth.uid() is not null
      and m.active = true
      and a.status = 'ACTIVE'
      and p.user_type = 'parceiro'
      and p.account_status = 'ACTIVE'
  )
  select (array_agg(account_id))[1]
  from eligible
  having count(*) = 1;
$function$;

create or replace function public.partner_account_context()
returns table(account_id uuid, account_name text, account_status text, member_role text)
language sql
stable
security definer
set search_path = public
as $function$
  with eligible as (
    select a.id, a.name, a.status, m.role
    from public.partner_accounts a
    join public.partner_account_members m on m.account_id = a.id
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and auth.uid() is not null
      and m.active = true
      and a.status = 'ACTIVE'
      and p.user_type = 'parceiro'
      and p.account_status = 'ACTIVE'
  )
  select e.id, e.name, e.status, e.role
  from eligible e
  where (select count(*) from eligible) = 1;
$function$;

-- Direct association is intentionally disabled until account-bound invitations
-- are implemented and validated end-to-end.
create or replace function public.partner_account_add_manager(
  p_email text,
  p_role text default 'manager'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
begin
  raise exception 'PARTNER_MANAGER_INVITES_REQUIRED'
    using hint = 'Use o fluxo de convites vinculado à organização.';
end;
$function$;

revoke all on function public.current_partner_account_id() from public, anon;
grant execute on function public.current_partner_account_id() to authenticated, service_role;

revoke all on function public.partner_account_context() from public, anon;
grant execute on function public.partner_account_context() to authenticated, service_role;

revoke all on function public.partner_account_add_manager(text, text) from public, anon, authenticated;
