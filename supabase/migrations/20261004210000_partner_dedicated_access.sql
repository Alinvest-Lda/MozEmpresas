create schema if not exists private;

create table if not exists private.partner_access_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create index if not exists partner_access_grants_email_idx
  on private.partner_access_grants (lower(email));

create index if not exists partner_access_grants_status_idx
  on private.partner_access_grants (status);

revoke all on private.partner_access_grants from anon, authenticated;

create or replace function public.partner_access_create(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1
    from public.platform_members pm
    where pm.user_id = auth.uid()
      and pm.active = true
      and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into private.partner_access_grants (email, token_hash, created_by, expires_at)
  values (lower(trim(p_email)), p_token_hash, auth.uid(), p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.partner_access_validate(p_token_hash text)
returns table(email text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  update private.partner_access_grants
  set status = 'EXPIRED'
  where token_hash = p_token_hash
    and status = 'PENDING'
    and expires_at <= now();

  return query
  select g.email, g.expires_at
  from private.partner_access_grants g
  where g.token_hash = p_token_hash
    and g.status = 'PENDING'
    and g.expires_at > now();
end;
$$;

create or replace function public.partner_access_claim(
  p_token_hash text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_email text;
begin
  select g.email into v_email
  from private.partner_access_grants g
  where g.token_hash = p_token_hash
    and g.status = 'PENDING'
    and g.expires_at > now()
  for update;

  if v_email is null then
    raise exception 'INVALID_OR_EXPIRED_ACCESS';
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = p_user_id
      and lower(u.email) = lower(v_email)
  ) then
    raise exception 'EMAIL_MISMATCH';
  end if;

  insert into public.profiles (id, full_name, user_type)
  select
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'parceiro'
  from auth.users u
  where u.id = p_user_id
  on conflict (id) do update
    set user_type = 'parceiro',
        full_name = case
          when public.profiles.full_name = '' then excluded.full_name
          else public.profiles.full_name
        end;

  update private.partner_access_grants
  set status = 'ACCEPTED',
      accepted_user_id = p_user_id,
      accepted_at = now()
  where token_hash = p_token_hash
    and status = 'PENDING';

  return true;
end;
$$;

revoke all on function public.partner_access_create(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.partner_access_create(text,text,timestamptz) to authenticated;

revoke all on function public.partner_access_validate(text) from public;
grant execute on function public.partner_access_validate(text) to anon, authenticated;

revoke all on function public.partner_access_claim(text,uuid) from public;
grant execute on function public.partner_access_claim(text,uuid) to anon, authenticated;
