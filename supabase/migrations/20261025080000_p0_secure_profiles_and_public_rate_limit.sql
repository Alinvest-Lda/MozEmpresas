-- P0 security hardening: profile column privileges and shared API rate limiting.
-- Existing RLS policies are preserved; protected profile fields gain a database guard.

revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, full_name, location, website, bio) on table public.profiles to authenticated;
grant update (full_name, location, website, bio, updated_at, account_status) on table public.profiles to authenticated;

create or replace view public.public_profiles
with (security_invoker = false)
as
select id, full_name, location, website, bio, created_at
from public.profiles
where account_status = 'ACTIVE';

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text := current_setting('request.jwt.claim.role', true);
begin
  if v_role = 'service_role' or public.is_super_admin() then
    return new;
  end if;

  if new.user_type is distinct from old.user_type then
    raise exception 'user_type can only be changed by a platform administrator'
      using errcode = '42501';
  end if;

  if new.account_status is distinct from old.account_status then
    if old.account_status <> 'ACTIVE'
       or new.account_status not in ('INACTIVE', 'DELETED') then
      raise exception 'account_status cannot be reactivated or changed by the account owner'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_self_privilege_escalation on public.profiles;
create trigger profiles_prevent_self_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_self_privilege_escalation();

create table if not exists public.public_rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.public_rate_limits enable row level security;
revoke all on table public.public_rate_limits from public, anon, authenticated;
grant all on table public.public_rate_limits to service_role;

create or replace function public.consume_public_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_key_hash is null
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.public_rate_limits(key_hash, window_started_at, request_count, updated_at)
  values (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update
  set
    request_count = case
      when public.public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else public.public_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else public.public_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
