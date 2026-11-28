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

  if v_definition !~ 'business_id\\s*,\\s*partner_account_id\\s*,\\s*user_id\\s*,\\s*amount_mzn\\s*,\\s*currency\\s*,\\s*method\\s*,\\s*status\\s*,\\s*reference\\s*,\\s*document_id\\s*,\\s*confirmed_at' then
    raise exception 'F395_FINANCIAL_PAYMENT_COLUMNS_NOT_FOUND';
  end if;
  v_definition:=regexp_replace(
    v_definition,
    'business_id\\s*,\\s*partner_account_id\\s*,\\s*user_id\\s*,\\s*amount_mzn\\s*,\\s*currency\\s*,\\s*method\\s*,\\s*status\\s*,\\s*reference\\s*,\\s*document_id\\s*,\\s*confirmed_at',
    'business_id,partner_account_id,user_id,campaign_id,amount_mzn,currency,method,status,reference,document_id,confirmed_at'
  );

  if v_definition !~ 'null\\s*,\\s*v_account\\.id\\s*,\\s*v_user\\s*,\\s*v_amount\\s*,\\s*''MZN''\\s*,\\s*p_payment_method' then
    raise exception 'F395_FINANCIAL_PAYMENT_VALUES_NOT_FOUND';
  end if;
  v_definition:=regexp_replace(
    v_definition,
    'null\\s*,\\s*v_account\\.id\\s*,\\s*v_user\\s*,\\s*v_amount\\s*,\\s*''MZN''\\s*,\\s*p_payment_method',
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
