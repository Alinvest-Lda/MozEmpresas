-- Exercise the actual F392 trigger and F412 reconciler using isolated synthetic records only.
do $test$
declare
  v_account uuid:='10000000-0000-4000-8000-000000000001';
  v_user uuid:='20000000-0000-4000-8000-000000000001';
  v_expired_campaign uuid:='30000000-0000-4000-8000-000000000001';
  v_live_campaign uuid:='30000000-0000-4000-8000-000000000002';
  v_expired_doc uuid:='40000000-0000-4000-8000-000000000001';
  v_live_doc uuid:='40000000-0000-4000-8000-000000000002';
  v_expired_payment uuid:='50000000-0000-4000-8000-000000000001';
  v_live_payment uuid:='50000000-0000-4000-8000-000000000002';
  v_result jsonb;
begin
  insert into public.partner_ad_campaigns(id,title,account_id,price_mzn,status)
  values(v_expired_campaign,'Expired campaign',v_account,1200,'REQUESTED'),
        (v_live_campaign,'Live pending campaign',v_account,1300,'REQUESTED');
  insert into public.partner_account_members(account_id,user_id,active) values(v_account,v_user,true);
  insert into public.financial_documents(id,amount_mzn,status,partner_account_id)
  values(v_expired_doc,1200,'ISSUED',v_account),(v_live_doc,1300,'ISSUED',v_account);

  insert into public.financial_payments(
    id,partner_account_id,user_id,campaign_id,amount_mzn,currency,method,status,document_id,created_at
  ) values
    (v_expired_payment,v_account,v_user,v_expired_campaign,1200,'MZN','BANK_TRANSFER','PENDING',v_expired_doc,now()-interval '25 hours'),
    (v_live_payment,v_account,v_user,v_live_campaign,1300,'MZN','BANK_TRANSFER','PENDING',v_live_doc,now()-interval '1 hour');

  if (select expires_at from public.financial_payments where id=v_expired_payment) > now() then
    raise exception 'F392 expired payment received future expiry';
  end if;
  if (select expires_at from public.financial_payments where id=v_live_payment) <= now() then
    raise exception 'F392 active payment received expired deadline';
  end if;

  insert into public.partner_ad_payment_orders(
    id,campaign_id,payment_method,status,financial_payment_id,amount_mzn,financial_document_id,account_id
  ) values
    ('60000000-0000-4000-8000-000000000001',v_expired_campaign,'BANK_TRANSFER','PENDING',v_expired_payment,1200,v_expired_doc,v_account),
    ('60000000-0000-4000-8000-000000000002',v_live_campaign,'BANK_TRANSFER','PENDING',v_live_payment,1300,v_live_doc,v_account);

  v_result:=public.reconcile_advertising_and_bank_transfer_expiry_f412();
  if (v_result#>>'{bank_transfers,payments_expired}')::int<>1 then
    raise exception 'F412 expected one expired payment, got %',v_result;
  end if;
  if (select status from public.financial_payments where id=v_expired_payment)<>'FAILED' then
    raise exception 'F412 did not fail expired payment';
  end if;
  if (select status from public.partner_ad_payment_orders where financial_payment_id=v_expired_payment)<>'FAILED' then
    raise exception 'F412 did not fail linked order';
  end if;
  if (select status from public.financial_documents where id=v_expired_doc)<>'VOID' then
    raise exception 'F412 did not void issued document';
  end if;
  if (select status from public.financial_payments where id=v_live_payment)<>'PENDING' then
    raise exception 'F412 incorrectly expired unexpired payment';
  end if;
  if (select status from public.partner_ad_payment_orders where financial_payment_id=v_live_payment)<>'PENDING' then
    raise exception 'F412 incorrectly failed unexpired order';
  end if;
  if (select status from public.financial_documents where id=v_live_doc)<>'ISSUED' then
    raise exception 'F412 incorrectly voided unexpired document';
  end if;

  v_result:=public.reconcile_advertising_and_bank_transfer_expiry_f412();
  if (v_result#>>'{bank_transfers,payments_expired}')::int<>0 then
    raise exception 'F412 reconciliation is not idempotent: %',v_result;
  end if;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform public.admin_confirm_partner_bank_transfer(v_live_payment,'CI bank transfer settlement');
  if (select status from public.financial_payments where id=v_live_payment)<>'CONFIRMED' then
    raise exception 'F392 bank transfer confirmation did not settle payment';
  end if;
  if (select expires_at from public.financial_payments where id=v_live_payment) is not null then
    raise exception 'F392 did not clear expiry after settlement';
  end if;
  if (select status from public.partner_ad_payment_orders where financial_payment_id=v_live_payment)<>'PAID' then
    raise exception 'F392 bank transfer confirmation did not settle order';
  end if;
  if (select status from public.financial_documents where id=v_live_doc)<>'PAID' then
    raise exception 'F392 bank transfer confirmation did not settle document';
  end if;
  if (select status from public.partner_ad_campaigns where id=v_live_campaign)<>'APPROVED' then
    raise exception 'F392 bank transfer confirmation did not approve campaign';
  end if;
  if not exists(select 1 from public.notifications where resource_id=v_live_campaign and title='Transferência bancária confirmada') then
    raise exception 'F398 did not notify partner after confirmation';
  end if;
end
$test$;


-- F405: request clock starts/restarts when payment is requested, not at lead creation.
do $f405$
declare
 v_renew uuid:='70000000-0000-4000-8000-000000000001';
 v_expired uuid:='70000000-0000-4000-8000-000000000002';
 v_deadline timestamptz;
 v_failed boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 insert into public.advertising_requests(id,status,created_at,payment_method,bank_transfer_expires_at)
 values(v_renew,'AWAITING_PAYMENT',now()-interval '3 days','BANK_TRANSFER',now()+interval '10 hours'),
       (v_expired,'AWAITING_PAYMENT',now()-interval '3 days','BANK_TRANSFER',now()-interval '1 second');

 perform public.admin_update_advertising_status('ADVERTISING_REQUEST',v_renew,'AWAITING_PAYMENT','renew transfer request',null,null,null);
 select bank_transfer_expires_at into v_deadline from public.advertising_requests where id=v_renew;
 if v_deadline < now()+interval '23 hours 59 minutes' or v_deadline > now()+interval '24 hours 1 minute' then
   raise exception 'F405 did not renew payment deadline to 24 hours: %',v_deadline;
 end if;
 if not exists(select 1 from public.advertising_admin_events where entity_id=v_renew and old_status='AWAITING_PAYMENT' and new_status='AWAITING_PAYMENT') then
   raise exception 'F405 did not audit same-state payment renewal';
 end if;

 begin
   perform public.admin_update_advertising_status('ADVERTISING_REQUEST',v_expired,'PAID','late transfer confirmation','BANK_TRANSFER','BANK-REF-1234',null);
 exception when check_violation then
   v_failed:=sqlerrm='BANK_TRANSFER_CONFIRMATION_EXPIRED';
 end;
 if not v_failed then raise exception 'F405 accepted an expired bank transfer'; end if;
 if (select status from public.advertising_requests where id=v_expired)<>'AWAITING_PAYMENT' then
   raise exception 'F405 changed status of expired request';
 end if;
end
$f405$;


-- F395/F396: a timed-out campaign payment can be reissued once, but a live attempt blocks duplicates.
do $f396$
declare
 v_campaign uuid:='30000000-0000-4000-8000-000000000003';
 v_account uuid:='10000000-0000-4000-8000-000000000001';
 v_old_payment uuid:='50000000-0000-4000-8000-000000000003';
 v_old_doc uuid:='40000000-0000-4000-8000-000000000003';
 v_order uuid:='60000000-0000-4000-8000-000000000003';
 v_new_payment uuid;
 v_result jsonb;
 v_duplicate_blocked boolean:=false;
begin
 perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
 insert into public.partner_ad_campaigns(id,title,account_id,price_mzn,status)
 values(v_campaign,'Reissue CI campaign',v_account,1500,'APPROVED');
 insert into public.financial_documents(id,amount_mzn,status,partner_account_id)
 values(v_old_doc,1500,'ISSUED',v_account);
 insert into public.financial_payments(
  id,partner_account_id,user_id,campaign_id,amount_mzn,currency,method,status,reference,document_id,created_at,expires_at
 ) values(v_old_payment,v_account,'20000000-0000-4000-8000-000000000001',v_campaign,1500,'MZN',
  'BANK_TRANSFER','PENDING','CI-OLD-TRANSFER',v_old_doc,now()-interval '26 hours',now()-interval '2 hours');
 insert into public.partner_ad_payment_orders(
  id,campaign_id,payment_method,status,financial_payment_id,amount_mzn,financial_document_id,account_id
 ) values(v_order,v_campaign,'BANK_TRANSFER','PENDING',v_old_payment,1500,v_old_doc,v_account);

 v_result:=public.admin_issue_partner_ad_payment(v_campaign,'BANK_TRANSFER',1500);
 v_new_payment:=(v_result->>'payment_id')::uuid;

 if (select status from public.financial_payments where id=v_old_payment)<>'FAILED' then
   raise exception 'F396 did not fail expired previous payment';
 end if;
 if (select status from public.financial_documents where id=v_old_doc)<>'VOID' then
   raise exception 'F396 did not void previous issued document';
 end if;
 if (select status from public.partner_ad_payment_orders where id=v_order)<>'PENDING'
    or (select financial_payment_id from public.partner_ad_payment_orders where id=v_order)<>v_new_payment then
   raise exception 'F396 did not replace expired order with new pending attempt';
 end if;
 if (select campaign_id from public.financial_payments where id=v_new_payment)<>v_campaign then
   raise exception 'F395 did not attach campaign_id to new financial payment';
 end if;
 if (select expires_at from public.financial_payments where id=v_new_payment) < now()+interval '23 hours 59 minutes' then
   raise exception 'F392 did not start a fresh 24h clock on reissue';
 end if;

 begin
   perform public.admin_issue_partner_ad_payment(v_campaign,'BANK_TRANSFER',1500);
 exception when others then
   v_duplicate_blocked:=sqlerrm='CAMPAIGN_PAYMENT_ALREADY_ISSUED';
 end;
 if not v_duplicate_blocked then raise exception 'F396 allowed duplicate live payment issuance'; end if;
end
$f396$;


-- F401/F395/F398: privileged RPCs retain a fixed search_path and narrow execute grants.
do $f401$
declare
 v_paths text[];
 v_oid regprocedure;
begin
 foreach v_oid in array array[
  'public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure,
  'public.admin_confirm_partner_bank_transfer(uuid,text)'::regprocedure,
  'public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure,
  'public.fail_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure
 ] loop
  select proconfig into v_paths from pg_proc where oid=v_oid;
  if v_paths is null or not (array_to_string(v_paths,';') like '%search_path=pg_catalog, public, pg_temp%') then
    raise exception 'F401 hardened search_path missing for %: %',v_oid,v_paths;
  end if;
 end loop;
 if has_function_privilege('anon','public.admin_issue_partner_ad_payment(uuid,text,numeric)','EXECUTE')
    or not has_function_privilege('authenticated','public.admin_issue_partner_ad_payment(uuid,text,numeric)','EXECUTE') then
   raise exception 'F395 partner payment issuance grants are too broad or missing';
 end if;
 if has_function_privilege('anon','public.admin_confirm_partner_bank_transfer(uuid,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.admin_confirm_partner_bank_transfer(uuid,text)','EXECUTE') then
   raise exception 'F398 bank transfer confirmation grants are too broad or missing';
 end if;
 if has_function_privilege('anon','public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)','EXECUTE') then
   raise exception 'F401 M-Pesa confirmation grants are too broad or missing';
 end if;
 if has_function_privilege('anon','public.fail_mpesa_partner_ad_payment(text,text,numeric,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.fail_mpesa_partner_ad_payment(text,text,numeric,text)','EXECUTE') then
   raise exception 'F401 M-Pesa failure grants are too broad or missing';
 end if;
end
$f401$;
