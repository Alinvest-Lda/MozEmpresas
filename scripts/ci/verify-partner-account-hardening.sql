-- Assertions for the partner-account hardening migration in disposable PostgreSQL.
do $unique_check$
begin
  begin
    insert into public.partner_account_members (account_id, user_id, role, active)
    values (
      '10000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000001',
      'manager',
      true
    );
    raise exception 'A second active partner membership was unexpectedly accepted';
  exception
    when unique_violation then null;
  end;
end;
$unique_check$;

-- Historical inactive memberships remain allowed.
insert into public.partner_account_members (account_id, user_id, role, active)
values (
  '10000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  'manager',
  false
);

do $context_check$
declare
  v_account_id uuid;
  v_context_account uuid;
  v_role text;
begin
  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
  v_account_id := public.current_partner_account_id();
  if v_account_id is distinct from '10000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'Active partner member did not resolve to exactly one account';
  end if;

  select account_id, member_role into v_context_account, v_role
  from public.partner_account_context();
  if v_context_account is distinct from v_account_id or v_role is distinct from 'owner' then
    raise exception 'Partner context did not return the expected account and role';
  end if;

  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
  if public.current_partner_account_id() is not null then
    raise exception 'Inactive partner profile must fail closed';
  end if;

  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
  if public.current_partner_account_id() is not null then
    raise exception 'Non-partner profile must fail closed';
  end if;

  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);
  if public.current_partner_account_id() is not null then
    raise exception 'Suspended partner account must fail closed';
  end if;

  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000006', true);
  if public.current_partner_account_id() is not null then
    raise exception 'User without membership must fail closed';
  end if;
end;
$context_check$;
