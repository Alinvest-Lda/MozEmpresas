-- F3.32/F3.33: production assertions for dedicated partner access and tenant scoping.
-- Read-only checks; safe to run against the production schema.

do $partner_access_security$
declare
  v_claim text;
  v_validate text;
  v_create_current text;
  v_account_context text;
  v_ad_request text;
  v_payment_issue text;
begin
  if not has_function_privilege('anon', 'public.partner_access_validate(text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.partner_access_validate(text)', 'EXECUTE') then
    raise exception 'Partner invite validation must remain callable before sign-in and after sign-in';
  end if;
  if has_function_privilege('public', 'public.partner_access_validate(text)', 'EXECUTE') then
    raise exception 'Partner invite validation must not be executable by PUBLIC';
  end if;

  if has_function_privilege('anon', 'public.partner_access_create(text,text,timestamp with time zone)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.partner_access_create(text,text,timestamp with time zone)', 'EXECUTE') then
    raise exception 'Legacy unscoped partner invite creation must not be executable by client roles';
  end if;
  if not has_function_privilege('service_role', 'public.partner_access_create(text,text,timestamp with time zone)', 'EXECUTE') then
    raise exception 'Legacy invite wrapper must remain available only to trusted service operations';
  end if;
  if not has_function_privilege('authenticated', 'public.partner_access_create(text,text,timestamp with time zone,uuid)', 'EXECUTE') then
    raise exception 'Current account-bound invite RPC must remain executable by authenticated Super Admin sessions';
  end if;

  select pg_get_functiondef('public.partner_access_claim(text,uuid)'::regprocedure) into v_claim;
  if v_claim not ilike '%auth.uid()%'
     or v_claim not ilike '%p_user_id is distinct from auth.uid()%'
     or v_claim not ilike '%expires_at>now()%'
     or v_claim not ilike '%for update%'
     or v_claim not ilike '%lower(u.email)=lower(v_email)%' then
    raise exception 'Partner claim is missing identity, expiry, email, or row-lock protection';
  end if;

  select pg_get_functiondef('public.partner_access_validate(text)'::regprocedure) into v_validate;
  if v_validate not ilike '%^[a-f0-9]{64}$%'
     or v_validate not ilike '%status=''PENDING''%'
     or v_validate not ilike '%expires_at>now()%' then
    raise exception 'Partner token validation is missing hash format, pending-state, or expiry checks';
  end if;

  select pg_get_functiondef('public.partner_access_create(text,text,timestamp with time zone,uuid)'::regprocedure)
    into v_create_current;
  if v_create_current not ilike '%pm.role=''super_admin''%'
     or v_create_current not ilike '%pm.active=true%' then
    raise exception 'Current partner invite creation is missing active Super Admin authorization';
  end if;

  select pg_get_functiondef('public.partner_account_context()'::regprocedure) into v_account_context;
  if v_account_context not ilike '%m.user_id=auth.uid()%'
     or v_account_context not ilike '%m.active=true%'
     or v_account_context not ilike '%a.portal_enabled=true%'
     or v_account_context not ilike '%count(*) from eligible)=1%' then
    raise exception 'Partner account context is missing active membership, portal, or single-account scoping';
  end if;

  select pg_get_functiondef('public.partner_ad_request(uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb,text)'::regprocedure)
    into v_ad_request;
  if v_ad_request not ilike '%current_partner_account_id()%'
     or v_ad_request not ilike '%current_partner_opportunity_role()%'
     or v_ad_request not ilike '%owner%manager%' then
    raise exception 'Partner ad request is missing account or role scoping';
  end if;

  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_payment_issue;
  if v_payment_issue not ilike '%pm.role=''super_admin''%'
     or v_payment_issue not ilike '%for update%'
     or v_payment_issue not ilike '%balance_credits=balance_credits-v_credits%'
     or v_payment_issue not ilike '%credit_transactions%' then
    raise exception 'Partner ad payment issue is missing Super Admin, wallet lock, debit, or ledger controls';
  end if;
end;
$partner_access_security$;
