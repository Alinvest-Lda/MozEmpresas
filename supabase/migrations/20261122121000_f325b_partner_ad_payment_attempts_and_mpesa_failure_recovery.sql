-- F3.25b: atomic partner campaign invoicing, credit settlement, M-Pesa confirmation and retry.
create or replace function public.admin_issue_partner_ad_payment(
  p_campaign_id uuid,
  p_payment_method text
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $function$
declare
  v_actor uuid:=auth.uid();
  v_campaign public.partner_ad_campaigns%rowtype;
  v_product public.partner_ad_products%rowtype;
  v_account public.partner_accounts%rowtype;
  v_business uuid;
  v_user uuid;
  v_wallet public.business_credit_wallets%rowtype;
  v_order public.partner_ad_payment_orders%rowtype;
  v_payment uuid;
  v_document uuid;
  v_reference text;
  v_amount numeric(14,2);
  v_credits integer:=0;
  v_attempt uuid:=gen_random_uuid();
begin
  if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_payment_method not in ('MPESA','CREDITS') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  select * into v_campaign from public.partner_ad_campaigns where id=p_campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.status not in ('REQUESTED','APPROVED') then raise exception 'CAMPAIGN_NOT_PAYABLE'; end if;
  select * into v_product from public.partner_ad_products where id=v_campaign.product_id and active=true;
  if not found then raise exception 'AD_PRODUCT_NOT_AVAILABLE'; end if;
  select * into v_account from public.partner_accounts where id=v_campaign.account_id and status='ACTIVE';
  if not found then raise exception 'PARTNER_ACCOUNT_INACTIVE'; end if;
  v_amount:=coalesce(v_campaign.price_mzn,v_product.price_mzn);
  if v_amount is null or v_amount<=0 then raise exception 'CAMPAIGN_PRICE_NOT_CONFIGURED'; end if;
  select user_id into v_user from public.partner_account_members where account_id=v_account.id and active=true
    order by case when role='owner' then 0 else 1 end,created_at limit 1;
  if v_user is null then raise exception 'PARTNER_MEMBER_REQUIRED'; end if;
  v_business:=v_account.business_id;
  select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
  if found and v_order.status not in ('FAILED') then raise exception 'CAMPAIGN_PAYMENT_ALREADY_ISSUED'; end if;
  if p_payment_method='CREDITS' then
    if v_business is null then raise exception 'PARTNER_CREDIT_WALLET_NOT_LINKED'; end if;
    select * into v_wallet from public.business_credit_wallets where business_id=v_business for update;
    if not found then raise exception 'PARTNER_CREDIT_WALLET_NOT_FOUND'; end if;
    v_credits:=ceil(v_amount)::integer;
    if v_wallet.balance_credits<v_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;
    update public.business_credit_wallets set balance_credits=balance_credits-v_credits,updated_at=now() where id=v_wallet.id;
  end if;
  v_reference:='PARTNER_AD:'||p_campaign_id::text||':'||replace(v_attempt::text,'-','');
  insert into public.financial_documents(
    business_id,partner_account_id,user_id,document_type,document_number,status,amount_mzn,currency,reference_type,reference_id,metadata
  ) values (
    null,v_account.id,v_user,'AD_PURCHASE',
    'PAD-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(v_attempt::text,'-',''),1,10),
    case when p_payment_method='CREDITS' then 'PAID' else 'ISSUED' end,
    v_amount,'MZN','PARTNER_AD_CAMPAIGN',p_campaign_id,
    jsonb_build_object('account_id',v_account.id,'campaign_id',p_campaign_id,'payment_method',p_payment_method,'business_wallet_id',v_business,'attempt_id',v_attempt)
  ) returning id into v_document;
  insert into public.financial_payments(
    business_id,partner_account_id,user_id,amount_mzn,currency,method,status,reference,document_id,confirmed_at
  ) values (
    null,v_account.id,v_user,v_amount,'MZN',p_payment_method,
    case when p_payment_method='CREDITS' then 'CONFIRMED' else 'PENDING' end,
    v_reference,v_document,case when p_payment_method='CREDITS' then now() else null end
  ) returning id into v_payment;
  if v_order.id is null then
    insert into public.partner_ad_payment_orders(
      campaign_id,account_id,business_id,amount_mzn,payment_method,credits_charged,status,payment_reference,
      financial_payment_id,financial_document_id,created_by,confirmed_at
    ) values (
      p_campaign_id,v_account.id,v_business,v_amount,p_payment_method,v_credits,
      case when p_payment_method='CREDITS' then 'PAID' else 'PENDING' end,
      v_reference,v_payment,v_document,v_actor,case when p_payment_method='CREDITS' then now() else null end
    ) returning * into v_order;
  else
    update public.partner_ad_payment_orders set
      business_id=v_business,amount_mzn=v_amount,payment_method=p_payment_method,credits_charged=v_credits,
      status=case when p_payment_method='CREDITS' then 'PAID' else 'PENDING' end,
      payment_reference=v_reference,financial_payment_id=v_payment,financial_document_id=v_document,
      provider_transaction_id=null,external_refund_reference=null,created_by=v_actor,
      confirmed_at=case when p_payment_method='CREDITS' then now() else null end,updated_at=now()
    where id=v_order.id returning * into v_order;
  end if;
  if p_payment_method='CREDITS' then
    insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
    values(v_wallet.id,'CONSUMPTION',-v_credits,v_amount,'PARTNER_AD_CAMPAIGN',p_campaign_id,'Publicidade de parceiro: '||v_campaign.title);
    update public.partner_ad_campaigns set status='ACTIVE',updated_at=now() where id=p_campaign_id;
  else
    update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=p_campaign_id;
  end if;
  return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment,'document_id',v_document,
    'payment_reference',v_reference,'amount_mzn',v_amount,'payment_method',p_payment_method,
    'status',case when p_payment_method='CREDITS' then 'PAID' else 'PENDING' end,'credits_charged',v_credits);
end;
$function$;

create or replace function public.confirm_mpesa_partner_ad_payment(
  p_payment_reference text,p_provider_transaction_id text,p_amount_mzn numeric,p_currency text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_payment public.financial_payments%rowtype; v_order public.partner_ad_payment_orders%rowtype;
begin
  if p_payment_reference is null or p_payment_reference !~ '^PARTNER_AD:[0-9a-fA-F-]{36}:[0-9a-fA-F]{32}$'
    or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 3 and 160
    or p_amount_mzn is null or p_amount_mzn<=0 or p_currency<>'MZN' then raise exception 'INVALID_PARTNER_AD_PAYMENT'; end if;
  select * into v_payment from public.financial_payments where reference=p_payment_reference and method='MPESA' and partner_account_id is not null for update;
  if not found then raise exception 'PARTNER_AD_PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.partner_ad_payment_orders where financial_payment_id=v_payment.id for update;
  if not found then raise exception 'PARTNER_AD_ORDER_NOT_FOUND'; end if;
  if v_payment.amount_mzn<>p_amount_mzn or v_payment.currency<>p_currency or v_order.amount_mzn<>p_amount_mzn then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if v_payment.status='CONFIRMED' and v_order.status='PAID' then
    if v_payment.provider_transaction_id=p_provider_transaction_id then return jsonb_build_object('order_id',v_order.id,'already_processed',true); end if;
    raise exception 'PARTNER_AD_PAYMENT_ALREADY_SETTLED';
  end if;
  if v_payment.status<>'PENDING' or v_order.status<>'PENDING' then raise exception 'PARTNER_AD_PAYMENT_NOT_PAYABLE'; end if;
  if exists(select 1 from public.financial_payments where provider_transaction_id=p_provider_transaction_id and id<>v_payment.id) then raise exception 'PROVIDER_TRANSACTION_ALREADY_USED'; end if;
  update public.financial_payments set status='CONFIRMED',provider_transaction_id=p_provider_transaction_id,confirmed_at=now() where id=v_payment.id;
  update public.financial_documents set status='PAID' where id=v_payment.document_id;
  update public.partner_ad_payment_orders set status='PAID',provider_transaction_id=p_provider_transaction_id,confirmed_at=now(),updated_at=now() where id=v_order.id;
  update public.partner_ad_campaigns set status='ACTIVE',updated_at=now() where id=v_order.campaign_id and status='APPROVED';
  return jsonb_build_object('order_id',v_order.id,'campaign_id',v_order.campaign_id,'already_processed',false);
end;
$function$;

create or replace function public.fail_mpesa_partner_ad_payment(
  p_payment_reference text,p_provider_transaction_id text,p_amount_mzn numeric,p_currency text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_payment public.financial_payments%rowtype; v_order public.partner_ad_payment_orders%rowtype;
begin
  if p_payment_reference is null or p_payment_reference !~ '^PARTNER_AD:[0-9a-fA-F-]{36}:[0-9a-fA-F]{32}$'
    or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 3 and 160
    or p_amount_mzn is null or p_amount_mzn<=0 or p_currency<>'MZN' then raise exception 'INVALID_PARTNER_AD_PAYMENT'; end if;
  select * into v_payment from public.financial_payments where reference=p_payment_reference and method='MPESA' and partner_account_id is not null for update;
  if not found then raise exception 'PARTNER_AD_PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.partner_ad_payment_orders where financial_payment_id=v_payment.id for update;
  if not found then raise exception 'PARTNER_AD_ORDER_NOT_FOUND'; end if;
  if v_payment.amount_mzn<>p_amount_mzn or v_order.amount_mzn<>p_amount_mzn then raise exception 'PAYMENT_AMOUNT_MISMATCH'; end if;
  if v_payment.status='CONFIRMED' or v_order.status='PAID' then return jsonb_build_object('ignored',true,'reason','ALREADY_SETTLED','order_id',v_order.id); end if;
  if v_payment.status<>'PENDING' or v_order.status<>'PENDING' then return jsonb_build_object('ignored',true,'reason','NOT_PENDING','order_id',v_order.id); end if;
  update public.financial_payments set status='FAILED' where id=v_payment.id;
  update public.financial_documents set status='VOID' where id=v_payment.document_id;
  update public.partner_ad_payment_orders set status='FAILED',updated_at=now() where id=v_order.id;
  return jsonb_build_object('ignored',false,'order_id',v_order.id);
end;
$function$;

revoke all on function public.admin_issue_partner_ad_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text) to authenticated;
revoke all on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
revoke all on function public.fail_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.fail_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
