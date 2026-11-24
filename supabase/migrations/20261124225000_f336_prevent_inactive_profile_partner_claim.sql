
-- F3.36: prevent activation from bypassing a pre-existing inactive/deletion-requested profile.
create or replace function public.partner_access_claim(
  p_token_hash text,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to public, private, auth, pg_temp
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

  if exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        p.account_status <> 'ACTIVE'
        or p.deactivated_at is not null
        or p.deletion_requested_at is not null
      )
  ) then
    raise exception 'PARTNER_PROFILE_INACTIVE';
  end if;

  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    split_part(u.email, '@', 1)
  )
  into v_name
  from auth.users u
  where u.id = p_user_id;

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
      where m.user_id = p_user_id and m.active = true
    ) then
      raise exception 'PARTNER_USER_ALREADY_ASSIGNED';
    end if;

    if exists (
      select 1 from public.partner_account_members m
      where m.account_id = v_account and m.active = true
    ) then
      raise exception 'PARTNER_ACCOUNT_ALREADY_ASSIGNED';
    end if;

    insert into public.partner_account_members(account_id, user_id, role, active)
    values (v_account, p_user_id, 'owner', true)
    on conflict (account_id, user_id) do update
      set role = 'owner', active = true, updated_at = now();
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
