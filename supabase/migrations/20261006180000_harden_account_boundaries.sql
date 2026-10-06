-- Account/module boundary hardening.
-- No RLS policies are changed by this migration.

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('empresa', 'profissional', 'parceiro'));

create or replace function public.is_partner_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_account_members m
    join public.partner_accounts a on a.id = m.account_id
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and m.active = true
      and a.status = 'ACTIVE'
      and p.user_type = 'parceiro'
      and coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
  );
$$;

revoke all on function public.is_partner_account() from public, anon;
grant execute on function public.is_partner_account() to authenticated;
