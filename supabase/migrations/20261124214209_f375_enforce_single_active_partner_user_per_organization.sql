-- F3.33: enforce the business rule of one active login per partner organization.
-- Historical inactive memberships remain available for audit.
create unique index if not exists partner_account_members_one_active_user_per_account_uidx
  on public.partner_account_members (account_id)
  where active = true;

create or replace function public.partner_access_create(
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_account_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
declare
  v_id uuid;
  v_account uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id = auth.uid()
      and pm.active = true
      and pm.role = 'super_admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_email is null or length(trim(p_email)) = 0
     or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at is null or p_expires_at <= now()
     or p_expires_at > now() + interval '30 days' then
    raise exception 'INVALID_PARTNER_INVITE';
  end if;

  if p_account_id is not null then
    select a.id into v_account
    from public.partner_accounts a
    where a.id = p_account_id
      and a.status = 'ACTIVE'
      and a.portal_enabled = true
    for update;

    if v_account is null then
      raise exception 'PARTNER_PORTAL_DISABLED_OR_UNAVAILABLE';
    end if;

    if exists (
      select 1 from public.partner_account_members m
      where m.account_id = v_account and m.active = true
    ) then
      raise exception 'PARTNER_ACCOUNT_ALREADY_ASSIGNED';
    end if;

    if exists (
      select 1 from private.partner_access_grants g
      where g.account_id = v_account
        and g.status = 'PENDING'
        and g.expires_at > now()
    ) then
      raise exception 'PARTNER_INVITE_ALREADY_PENDING';
    end if;
  end if;

  insert into private.partner_access_grants(
    email, token_hash, created_by, expires_at, account_id
  )
  values (
    lower(trim(p_email)), p_token_hash, auth.uid(), p_expires_at, p_account_id
  )
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.partner_access_claim(
  p_token_hash text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
declare
  v_email text;
  v_name text;
  v_account uuid;
  v_grant_account uuid;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  select g.email, g.account_id
  into v_email, v_grant_account
  from private.partner_access_grants g
  where g.token_hash = p_token_hash
    and g.status = 'PENDING'
    and g.expires_at > now()
  for update;

  if v_email is null then
    raise exception 'INVALID_OR_EXPIRED_ACCESS';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id and lower(u.email) = lower(v_email)
  ) then
    raise exception 'EMAIL_MISMATCH';
  end if;

  select coalesce(
    nullif(trim(raw_user_meta_data->>'full_name'), ''),
    split_part(email, '@', 1)
  )
  into v_name
  from auth.users
  where id = p_user_id;

  insert into public.profiles(id, full_name, user_type)
  values (p_user_id, v_name, 'parceiro')
  on conflict (id) do update
    set user_type = 'parceiro', full_name = excluded.full_name;

  if v_grant_account is not null then
    select a.id into v_account
    from public.partner_accounts a
    where a.id = v_grant_account
      and a.status = 'ACTIVE'
      and a.portal_enabled = true
    for update;

    if v_account is null then
      raise exception 'PARTNER_PORTAL_DISABLED_OR_UNAVAILABLE';
    end if;

    if exists (
      select 1 from public.partner_account_members m
      where m.user_id = p_user_id
        and m.account_id <> v_account
        and m.active = true
    ) then
      raise exception 'PARTNER_ACCOUNT_ALREADY_ASSIGNED';
    end if;

    if exists (
      select 1 from public.partner_account_members m
      where m.account_id = v_account
        and m.user_id <> p_user_id
        and m.active = true
    ) then
      raise exception 'PARTNER_ACCOUNT_ALREADY_ASSIGNED';
    end if;

    insert into public.partner_account_members(account_id, user_id, role, active)
    values (v_account, p_user_id, 'manager', true)
    on conflict (account_id, user_id) do update
      set active = true, updated_at = now();
  else
    select m.account_id into v_account
    from public.partner_account_members m
    where m.user_id = p_user_id and m.active = true
    limit 1;

    if v_account is null then
      insert into public.partner_accounts(name, operating_model, portal_enabled)
      values (v_name, 'SELF_SERVICE', true)
      returning id into v_account;

      insert into public.partner_account_members(account_id, user_id, role, active)
      values (v_account, p_user_id, 'owner', true);
    end if;
  end if;

  update private.partner_access_grants
  set status = 'ACCEPTED',
      accepted_user_id = p_user_id,
      accepted_at = now()
  where token_hash = p_token_hash
    and status = 'PENDING';

  return true;
end;
$function$;
