-- Disposable PostgreSQL fixtures for the partner-account hardening migration.
do $roles$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$roles$;

create schema auth;
create function auth.uid()
returns uuid
language sql
stable
as $function$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$function$;

create table public.partner_accounts (
  id uuid primary key,
  name text not null,
  status text not null
);

create table public.profiles (
  id uuid primary key,
  user_type text not null,
  account_status text not null
);

create table public.partner_account_members (
  account_id uuid not null references public.partner_accounts(id),
  user_id uuid not null references public.profiles(id),
  role text not null,
  active boolean not null default true
);

insert into public.partner_accounts (id, name, status) values
  ('10000000-0000-4000-8000-000000000001', 'Parceiro A', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000002', 'Parceiro B', 'ACTIVE'),
  ('10000000-0000-4000-8000-000000000003', 'Parceiro suspenso', 'SUSPENDED');

insert into public.profiles (id, user_type, account_status) values
  ('20000000-0000-4000-8000-000000000001', 'parceiro', 'ACTIVE'),
  ('20000000-0000-4000-8000-000000000002', 'parceiro', 'ACTIVE'),
  ('20000000-0000-4000-8000-000000000003', 'parceiro', 'SUSPENDED'),
  ('20000000-0000-4000-8000-000000000004', 'empresa', 'ACTIVE'),
  ('20000000-0000-4000-8000-000000000005', 'parceiro', 'ACTIVE');

insert into public.partner_account_members (account_id, user_id, role, active) values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'owner', true),
  ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'manager', true),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'owner', true),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'owner', true),
  ('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000005', 'owner', true);
