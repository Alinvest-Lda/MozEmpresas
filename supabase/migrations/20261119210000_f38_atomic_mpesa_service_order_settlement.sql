-- F3.8: atomic M-Pesa service-order creation and settlement.
alter table public.platform_service_orders
  add column if not exists mpesa_idempotency_key uuid;

create unique index if not exists platform_service_orders_business_mpesa_idem_uidx
  on public.platform_service_orders (business_id, mpesa_idempotency_key)
  where mpesa_idempotency_key is not null;

alter table public.financial_payments
  add column if not exists provider_transaction_id text;

create unique index if not exists financial_payments_provider_transaction_uidx
  on public.financial_payments (method, provider_transaction_id)
  where provider_transaction_id is not null;

create unique index if not exists financial_payments_reference_method_pending_uidx
  on public.financial_payments (method, reference)
  where reference is not null;

create or replace function public.create_mpesa_platform_service_order(
  p_service_id uuid,
  p_business_id uuid,
  p_user_id uuid,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_service public.platform_services%rowtype;
  v_order public.platform_service_orders%rowtype;
  v_payment public.financial_payments%rowtype;
  v_reference text;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_service_id is null or p_business_id is null or p_idempotency_key is null then
    raise exception 'INVALID_PURCHASE_REQUEST';
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id=p_business_id and b.archived_at is null and b.owner_id=p_user_id
  ) and not exists (
    select 1 from public.business_members bm
    where bm.business_id=p_business_id and bm.user_id=p_user_id
      and bm.role in ('owner','admin','operator')
  ) then raise exception 'FORBIDDEN'; end if;

  -- Serializes retries for this business, including simultaneous requests.
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text || ':' || p_idempotency_key::text, 0));

  select * into v_order from public.platform_service_orders
  where business_id=p_business_id and mpesa_idempotency_key=p_idempotency_key;
  if found then
    select * into v_payment from public.financial_payments
    where reference='SERVICE:'||v_order.id::text and method='MPESA';
    if not found then raise exception 'PAYMENT_RECORD_MISSING'; end if;
    return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'reference',v_payment.reference,'already_exists',true);
  end if;

  select * into v_service from public.platform_services
  where id=p_service_id and active=true for share;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  if v_service.price is null or v_service.price <= 0 then raise exception 'SERVICE_NOT_PRICED'; end if;

  insert into public.platform_service_orders(
    service_id,business_id,requester_user_id,amount_mzn,currency,payment_method,
    credits_charged,status,mpesa_reference,starts_at,ends_at,renewal_period,
    auto_renew,renewal_status,mpesa_idempotency_key
  ) values (
    v_service.id,p_business_id,p_user_id,v_service.price,v_service.currency,'MPESA',
    0,'PENDING_PAYMENT',null,null,null,v_service.renewal_period,false,'NONE',p_idempotency_key
  ) returning * into v_order;

  v_reference := 'SERVICE:'||v_order.id::text;
  update public.platform_service_orders set mpesa_reference=v_reference where id=v_order.id;

  insert into public.financial_payments(
    business_id,user_id,amount_mzn,currency,method,status,reference
  ) values (
    p_business_id,p_user_id,v_service.price,v_service.currency,'MPESA','PENDING',v_reference
  ) returning * into v_payment;

  return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'reference',v_reference,'already_exists',false);
end
$function$;

create or replace function public.confirm_mpesa_platform_service_payment(
  p_payment_reference text,
  p_provider_transaction_id text,
  p_amount_mzn numeric,
  p_currency text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_payment public.financial_payments%rowtype;
  v_order public.platform_service_orders%rowtype;
  v_service public.platform_services%rowtype;
  v_now timestamptz := now();
  v_starts timestamptz;
  v_ends timestamptz;
  v_period text;
begin
  if p_payment_reference is null or p_payment_reference !~ '^SERVICE:[0-9a-fA-F-]{36}$'
     or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 3 and 160
     or p_amount_mzn is null or p_amount_mzn <= 0 or p_currency <> 'MZN'
  then raise exception 'INVALID_PAYMENT_CONFIRMATION'; end if;

  select * into v_payment from public.financial_payments
  where reference=p_payment_reference and method='MPESA'
  for update;
  if not found then raise exception 'SERVICE_PAYMENT_NOT_FOUND'; end if;

  select * into v_order from public.platform_service_orders
  where id=substring(p_payment_reference from 9)::uuid
    and id=(select nullif(split_part(p_payment_reference,':',2),'')::uuid)
  for update;
  if not found or v_order.business_id<>v_payment.business_id then
    raise exception 'SERVICE_ORDER_NOT_FOUND';
  end if;
  if v_payment.amount_mzn<>p_amount_mzn or v_payment.currency<>p_currency
     or v_order.amount_mzn<>p_amount_mzn or v_order.currency<>p_currency then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if v_payment.status='CONFIRMED' and v_order.status in ('PAID','PROCESSING','COMPLETED') then
    if v_payment.provider_transaction_id is distinct from p_provider_transaction_id then
      raise exception 'SERVICE_PAYMENT_ALREADY_SETTLED';
    end if;
    return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'already_processed',true);
  end if;
  if v_payment.status<>'PENDING' or v_order.status<>'PENDING_PAYMENT' then
    raise exception 'SERVICE_ORDER_NOT_PAYABLE';
  end if;

  if exists (
    select 1 from public.financial_payments
    where method='MPESA' and provider_transaction_id=p_provider_transaction_id and id<>v_payment.id
  ) then raise exception 'PROVIDER_TRANSACTION_ALREADY_USED'; end if;

  select * into v_service from public.platform_services where id=v_order.service_id;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;

  v_period := case
    when v_service.billing='MONTHLY' then 'MONTHLY'
    when v_service.billing='ANNUAL' then 'ANNUAL'
    else null
  end;
  v_starts := v_now;
  v_ends := case
    when v_service.billing='MONTHLY' then v_now + interval '1 month'
    when v_service.billing='ANNUAL' then v_now + interval '1 year'
    when v_service.default_term_days is not null then v_now + make_interval(days=>v_service.default_term_days)
    else null
  end;

  update public.financial_payments
  set status='CONFIRMED',confirmed_at=v_now,provider_transaction_id=p_provider_transaction_id
  where id=v_payment.id;

  update public.platform_service_orders
  set status='PAID',starts_at=v_starts,ends_at=v_ends,
      renewal_period=v_period,renewal_status=case when v_period is null then 'NONE' else 'ACTIVE' end,
      updated_at=v_now
  where id=v_order.id;

  insert into public.financial_documents(
    business_id,user_id,document_type,document_number,status,amount_mzn,currency,
    reference_type,reference_id,due_at,metadata
  ) values (
    v_order.business_id,v_payment.user_id,'INVOICE',
    'INV-'||to_char(v_now,'YYYYMMDD')||'-'||substr(replace(v_order.id::text,'-',''),1,8),
    'PAID',v_order.amount_mzn,v_order.currency,'PLATFORM_SERVICE_ORDER',v_order.id,
    v_ends,jsonb_build_object('payment_id',v_payment.id,'provider_transaction_id',p_provider_transaction_id)
  ) on conflict do nothing;

  return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'already_processed',false);
end
$function$;

revoke all on function public.create_mpesa_platform_service_order(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.create_mpesa_platform_service_order(uuid,uuid,uuid,uuid) to authenticated;
revoke all on function public.confirm_mpesa_platform_service_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_mpesa_platform_service_payment(text,text,numeric,text) to service_role;
