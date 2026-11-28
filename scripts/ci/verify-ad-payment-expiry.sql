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

  update public.financial_payments set status='CONFIRMED' where id=v_live_payment;
  if (select expires_at from public.financial_payments where id=v_live_payment) is not null then
    raise exception 'F392 did not clear expiry after settlement';
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

 perform public.admin_update_advertising_status('ADVERTISING_REQUEST',v_renew,'AWAITING_PAYMENT','renew transfer request','BANK_TRANSFER',null,null);
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
