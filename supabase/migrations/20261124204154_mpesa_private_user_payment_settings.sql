-- Move payer MSISDN out of profiles: that relation has active public-profile read policies.
create table if not exists public.user_payment_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mpesa_msisdn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_payment_settings_mpesa_msisdn_format_check
    check (mpesa_msisdn is null or mpesa_msisdn ~ '^2588[2-9][0-9]{7}$')
);

alter table public.user_payment_settings enable row level security;
revoke all on public.user_payment_settings from anon, public;
grant select, insert, update on public.user_payment_settings to authenticated;

create policy user_payment_settings_select_own
  on public.user_payment_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy user_payment_settings_insert_own
  on public.user_payment_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy user_payment_settings_update_own
  on public.user_payment_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.profiles drop column if exists mpesa_msisdn;
