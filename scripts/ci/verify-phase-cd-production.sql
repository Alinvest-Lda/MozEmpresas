-- Production-schema hardening assertions and rollback-only payment E2E.
-- Run as a trusted database administrator. All synthetic payment records roll back.

do $security_assertions$
declare
  v_missing_paths integer;
  v_unexpected_anon_functions integer;
  v_unprotected_locked_tables integer;
begin
  select count(*) into v_missing_paths
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig,array[]::text[])) setting
      where setting like 'search_path=%'
        and setting ~ '(^|,\s*)pg_temp(\s*,|$)'
    );
  if v_missing_paths<>0 then raise exception 'SECURITY_DEFINER_SEARCH_PATH_NOT_HARDENED:%',v_missing_paths; end if;

  select count(*) into v_unexpected_anon_functions
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
    and has_function_privilege('anon',p.oid,'EXECUTE')
    and p.proname not in ('get_ad_decision','home_ad_slots','partner_access_validate','record_ad_interest');
  if v_unexpected_anon_functions<>0 then raise exception 'UNEXPECTED_ANON_SECURITY_DEFINER:%',v_unexpected_anon_functions; end if;

  if has_function_privilege('public','public.partner_access_validate(text)','EXECUTE') then
    raise exception 'PARTNER_VALIDATION_GRANTED_TO_PUBLIC';
  end if;

  if has_table_privilege('anon','public.partner_contract_financial_summary','SELECT')
     or has_table_privilege('anon','public.partner_contract_financial_summary','INSERT')
     or has_table_privilege('anon','public.partner_contract_financial_summary','UPDATE')
     or has_table_privilege('authenticated','public.partner_contract_financial_summary','INSERT')
     or has_table_privilege('authenticated','public.partner_contract_financial_summary','UPDATE')
     or has_table_privilege('authenticated','public.partner_contract_financial_summary','DELETE') then
    raise exception 'PARTNER_FINANCIAL_VIEW_NOT_READ_ONLY';
  end if;
  if not has_table_privilege('authenticated','public.partner_contract_financial_summary','SELECT') then
    raise exception 'PARTNER_FINANCIAL_VIEW_AUTH_READ_MISSING';
  end if;

  if exists (
    select 1 from pg_class c
    cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
    where c.relnamespace='public'::regnamespace and c.relkind in ('r','p')
      and x.grantee in ('anon'::regrole,'authenticated'::regrole)
      and x.privilege_type='TRUNCATE'
  ) then raise exception 'API_ROLE_TRUNCATE_GRANT_FOUND'; end if;

  select count(*) into v_unprotected_locked_tables
  from pg_class c
  where c.relnamespace='public'::regnamespace and c.relkind in ('r','p') and c.relrowsecurity
    and not exists(select 1 from pg_policy p where p.polrelid=c.oid)
    and (
      has_table_privilege('anon',c.oid,'SELECT')
      or has_table_privilege('anon',c.oid,'INSERT')
      or has_table_privilege('anon',c.oid,'UPDATE')
      or has_table_privilege('anon',c.oid,'DELETE')
      or has_table_privilege('authenticated',c.oid,'SELECT')
      or has_table_privilege('authenticated',c.oid,'INSERT')
      or has_table_privilege('authenticated',c.oid,'UPDATE')
      or has_table_privilege('authenticated',c.oid,'DELETE')
    );
  if v_unprotected_locked_tables<>0 then raise exception 'RLS_LOCKED_TABLES_HAVE_API_GRANTS:%',v_unprotected_locked_tables; end if;

  if not exists(select 1 from storage.buckets where id='listing-media' and file_size_limit=10485760 and allowed_mime_types @> array['application/pdf','image/png'])
     or not exists(select 1 from storage.buckets where id='payment-proofs' and file_size_limit=10485760 and allowed_mime_types @> array['application/pdf','image/jpeg']) then
    raise exception 'STORAGE_BUCKET_LIMITS_NOT_APPLIED';
  end if;
end;
$security_assertions$;

-- A non-admin authenticated identity must be rejected before argument validation.
begin;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $authorization_tests$
begin
  begin
    perform public.admin_credit_financial_report(current_date,current_date);
    raise exception 'ADMIN_FINANCIAL_REPORT_ACCEPTED_NON_ADMIN';
  exception when others then
    if sqlerrm not like '%FORBIDDEN%' then raise; end if;
  end;
  begin
    perform public.admin_cancel_platform_service_order(null,null,null);
    raise exception 'ADMIN_ORDER_CANCELLATION_ACCEPTED_NON_ADMIN';
  exception when others then
    if sqlerrm not like '%FORBIDDEN%' then raise; end if;
  end;
end;
$authorization_tests$;
rollback;

-- Full database-side M-Pesa credit purchase: callback replay, identity conflict,
-- atomic wallet/ledger posting, duplicate settlement and rollback.
begin;
select set_config('request.jwt.claim.role','service_role',true);
do $payment_e2e$
declare
  v_business uuid;
  v_user uuid;
  v_package public.credit_packages%rowtype;
  v_reference text := 'E2E-ROLLBACK-'||replace(gen_random_uuid()::text,'-','');
  v_provider text := 'E2E-TX-'||replace(gen_random_uuid()::text,'-','');
  v_request uuid;
  v_event public.credit_payment_callback_events;
  v_first jsonb;
  v_second jsonb;
  v_wallet_before integer;
  v_wallet_after integer;
  v_ledger_before integer;
  v_ledger_after integer;
  v_postings integer;
begin
  select b.id,b.owner_id into v_business,v_user
  from public.businesses b
  where b.archived_at is null
    and not exists(select 1 from public.credit_purchase_requests r
      where r.business_id=b.id and r.status in ('REQUESTED','PAYMENT_PENDING'))
  order by b.created_at limit 1;
  if v_business is null or v_user is null then
    raise exception 'E2E_FIXTURE_UNAVAILABLE_NO_ELIGIBLE_BUSINESS';
  end if;
  select * into v_package from public.credit_packages where active=true order by price_mzn limit 1;
  if v_package.id is null then raise exception 'E2E_FIXTURE_UNAVAILABLE_NO_ACTIVE_CREDIT_PACKAGE'; end if;

  select coalesce(w.balance_credits,0) into v_wallet_before
  from (select 1) seed
  left join public.business_credit_wallets w on w.business_id=v_business;
  select coalesce(sum(t.credits),0)::integer into v_ledger_before
  from public.credit_transactions t
  join public.business_credit_wallets w on w.id=t.wallet_id
  where w.business_id=v_business;

  insert into public.credit_purchase_requests(
    business_id,package_id,requester_user_id,status,amount_mzn,credits,payment_method,payment_reference
  ) values(
    v_business,v_package.id,v_user,'PAYMENT_PENDING',v_package.price_mzn,
    v_package.credit_volume,'MPESA',v_reference
  ) returning id into v_request;

  v_event:=public.record_credit_payment_callback(
    v_provider,v_reference,v_package.price_mzn,'MZN','E2E-MERCHANT','SUCCESS',now()
  );
  update public.credit_payment_callback_events
    set processing_status='PROCESSED',processed_at=now()
    where id=v_event.id;

  v_event:=public.record_credit_payment_callback(
    v_provider,v_reference,v_package.price_mzn,'MZN','E2E-MERCHANT','SUCCESS',now()+interval '1 second'
  );
  if v_event.delivery_count<>2 or v_event.processing_status<>'PROCESSED' then
    raise exception 'CALLBACK_REPLAY_NOT_IDEMPOTENT';
  end if;

  begin
    perform public.record_credit_payment_callback(
      v_provider,v_reference,v_package.price_mzn+1,'MZN','E2E-MERCHANT','SUCCESS',now()+interval '2 seconds'
    );
    raise exception 'CALLBACK_IDENTITY_CONFLICT_NOT_REJECTED';
  exception when others then
    if sqlerrm not like '%CALLBACK_TRANSACTION_CONFLICT%' then raise; end if;
  end;

  v_first:=public.confirm_mpesa_credit_purchase(v_reference,v_provider,v_package.price_mzn,'MZN','{"test":true}'::jsonb);
  v_second:=public.confirm_mpesa_credit_purchase(v_reference,v_provider,v_package.price_mzn,'MZN','{"test":true}'::jsonb);
  if coalesce((v_first->>'already_processed')::boolean,true) then raise exception 'FIRST_SETTLEMENT_NOT_APPLIED'; end if;
  if not coalesce((v_second->>'already_processed')::boolean,false) then raise exception 'REPLAY_SETTLEMENT_NOT_IDEMPOTENT'; end if;

  select balance_credits into v_wallet_after from public.business_credit_wallets where business_id=v_business;
  select coalesce(sum(t.credits),0)::integer into v_ledger_after
  from public.credit_transactions t
  join public.business_credit_wallets w on w.id=t.wallet_id
  where w.business_id=v_business;
  select count(*) into v_postings from public.credit_transactions
  where reference_type='CREDIT_PURCHASE_REQUEST' and reference_id=v_request and type='PURCHASE';

  if v_wallet_after<>v_wallet_before+v_package.credit_volume then raise exception 'WALLET_INCREMENT_MISMATCH'; end if;
  if v_ledger_after<>v_ledger_before+v_package.credit_volume then raise exception 'LEDGER_INCREMENT_MISMATCH'; end if;
  if v_postings<>1 then raise exception 'DUPLICATE_CREDIT_LEDGER_POSTING'; end if;
end;
$payment_e2e$;
rollback;

do $no_residue$
begin
  if exists(select 1 from public.credit_purchase_requests where payment_reference like 'E2E-ROLLBACK-%')
     or exists(select 1 from public.credit_payment_callback_events where provider_transaction_id like 'E2E-TX-%') then
    raise exception 'E2E_TEST_LEFT_RESIDUAL_DATA';
  end if;
end;
$no_residue$;
