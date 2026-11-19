-- F3.7: idempotent credit-funded platform service checkout.
alter table public.platform_service_orders
  add column if not exists idempotency_key uuid;

create unique index if not exists platform_service_orders_business_idempotency_uidx
  on public.platform_service_orders (business_id, idempotency_key)
  where idempotency_key is not null;

drop function if exists public.purchase_platform_service_with_credits(uuid, uuid, uuid);

create function public.purchase_platform_service_with_credits(
  p_service_id uuid,
  p_business_id uuid,
  p_user_id uuid,
  p_idempotency_key uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_service public.platform_services%rowtype;
  v_wallet public.business_credit_wallets%rowtype;
  v_order_id uuid;
  v_subscription_id uuid;
  v_credits integer;
  v_starts_at timestamptz := now();
  v_ends_at timestamptz;
  v_renewal_period text;
  v_renewal_status text := 'NONE';
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'UNAUTHENTICATED';
  end if;
  if p_service_id is null or p_business_id is null or p_idempotency_key is null then
    raise exception 'INVALID_PURCHASE_REQUEST';
  end if;

  if not exists (
    select 1 from public.businesses
    where id=p_business_id and archived_at is null
      and owner_id=p_user_id
  ) and not exists (
    select 1 from public.business_members
    where business_id=p_business_id and user_id=p_user_id
      and role in ('owner','admin','operator')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Serialize purchases for the same business by locking its wallet.
  select * into v_wallet
  from public.business_credit_wallets
  where business_id=p_business_id
  for update;
  if not found then raise exception 'NO_WALLET'; end if;

  -- Re-check after acquiring the wallet lock: a concurrent retry may have completed.
  select id into v_order_id
  from public.platform_service_orders
  where business_id=p_business_id and idempotency_key=p_idempotency_key;
  if found then
    return v_order_id;
  end if;

  select * into v_service
  from public.platform_services
  where id=p_service_id and active=true
  for share;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  if v_service.price is null or v_service.price <= 0 then
    raise exception 'SERVICE_NOT_PRICED';
  end if;

  v_credits := ceil(v_service.price)::integer;
  if v_wallet.balance_credits < v_credits then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  v_renewal_period := case
    when v_service.billing='MONTHLY' then 'MONTHLY'
    when v_service.billing='ANNUAL' then 'ANNUAL'
    else null
  end;
  v_ends_at := case
    when v_service.billing='MONTHLY' then v_starts_at + interval '1 month'
    when v_service.billing='ANNUAL' then v_starts_at + interval '1 year'
    when v_service.default_term_days is not null
      then v_starts_at + make_interval(days => v_service.default_term_days)
    else null
  end;
  v_renewal_status := case when v_renewal_period is null then 'NONE' else 'ACTIVE' end;

  update public.business_credit_wallets
  set balance_credits=balance_credits-v_credits,updated_at=now()
  where id=v_wallet.id;

  insert into public.platform_service_orders(
    service_id,business_id,requester_user_id,amount_mzn,currency,payment_method,
    credits_charged,status,starts_at,ends_at,renewal_period,auto_renew,
    renewal_status,idempotency_key
  ) values (
    v_service.id,p_business_id,p_user_id,v_service.price,
    coalesce(v_service.currency,'MZN'),'CREDITS',v_credits,'PAID',
    v_starts_at,v_ends_at,v_renewal_period,false,v_renewal_status,
    p_idempotency_key
  ) returning id into v_order_id;

  if v_renewal_period is not null then
    insert into public.platform_service_subscriptions(
      service_id,business_id,current_order_id,status,starts_at,ends_at,
      renewal_period,auto_renew,next_renewal_at
    ) values (
      v_service.id,p_business_id,v_order_id,'ACTIVE',v_starts_at,v_ends_at,
      v_renewal_period,false,v_ends_at
    ) returning id into v_subscription_id;
  end if;

  insert into public.credit_transactions(
    wallet_id,type,credits,amount_mzn,reference_type,reference_id,description
  ) values (
    v_wallet.id,'CONSUMPTION',-v_credits,v_service.price,
    'PLATFORM_SERVICE_ORDER',v_order_id,'Compra de serviço: '||v_service.name
  );

  insert into public.financial_documents(
    business_id,user_id,document_type,document_number,status,amount_mzn,currency,
    reference_type,reference_id,due_at,metadata
  ) values (
    p_business_id,p_user_id,'INVOICE',
    'INV-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(v_order_id::text,'-',''),1,8),
    'PAID',v_service.price,coalesce(v_service.currency,'MZN'),
    'PLATFORM_SERVICE_ORDER',v_order_id,v_ends_at,
    jsonb_build_object('subscription_id',v_subscription_id,'renewal_period',v_renewal_period)
  );

  return v_order_id;
end
$function$;

revoke all on function public.purchase_platform_service_with_credits(uuid,uuid,uuid,uuid) from public, anon;
grant execute on function public.purchase_platform_service_with_credits(uuid,uuid,uuid,uuid) to authenticated;
