-- F3.95: complete partner campaign bank-transfer issuance so the F392 expiry/settlement path is reachable.
alter table public.partner_ad_payment_orders
  drop constraint if exists partner_ad_payment_orders_payment_method_check;
alter table public.partner_ad_payment_orders
  add constraint partner_ad_payment_orders_payment_method_check
  check(payment_method in ('MPESA','CREDITS','BANK_TRANSFER')) not valid;
alter table public.partner_ad_payment_orders
  validate constraint partner_ad_payment_orders_payment_method_check;

-- Preserve the negotiated-price and fixed-catalogue rules while extending the existing
-- atomic issuance RPC. The financial payment must carry campaign_id so F392 can reconcile
-- the settlement against the matching payment order and campaign.
do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_definition;

  if position('if p_payment_method not in (''MPESA'',''CREDITS'')' in v_definition)=0 then
    raise exception 'F395_PAYMENT_METHOD_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(
    v_definition,
    'if p_payment_method not in (''MPESA'',''CREDITS'')',
    'if p_payment_method not in (''MPESA'',''CREDITS'',''BANK_TRANSFER'')'
  );

  if position('business_id,partner_account_id,user_id,amount_mzn,currency,method,status,reference,document_id,confirmed_at' in v_definition)=0 then
    raise exception 'F395_FINANCIAL_PAYMENT_COLUMNS_NOT_FOUND';
  end if;
  v_definition:=replace(
    v_definition,
    'business_id,partner_account_id,user_id,amount_mzn,currency,method,status,reference,document_id,confirmed_at',
    'business_id,partner_account_id,user_id,campaign_id,amount_mzn,currency,method,status,reference,document_id,confirmed_at'
  );

  if position('null,v_account.id,v_user,v_amount,''MZN'',p_payment_method' in v_definition)=0 then
    raise exception 'F395_FINANCIAL_PAYMENT_VALUES_NOT_FOUND';
  end if;
  v_definition:=replace(
    v_definition,
    'null,v_account.id,v_user,v_amount,''MZN'',p_payment_method',
    'null,v_account.id,v_user,p_campaign_id,v_amount,''MZN'',p_payment_method'
  );

  if position('''BANK_TRANSFER''' in v_definition)=0
    or position('user_id,campaign_id,amount_mzn' in v_definition)=0 then
    raise exception 'F395_REWRITE_INCOMPLETE';
  end if;

  execute v_definition;
end
$migration$;

revoke all on function public.admin_issue_partner_ad_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
