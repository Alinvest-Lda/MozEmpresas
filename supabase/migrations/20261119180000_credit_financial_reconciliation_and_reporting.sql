-- F3.5: authoritative credit ledger reconciliation and financial reporting.
-- Preserve immutable ledger rows if an administrator attempts to remove a wallet.
alter table public.credit_transactions
  drop constraint if exists credit_transactions_wallet_id_fkey;
alter table public.credit_transactions
  add constraint credit_transactions_wallet_id_fkey
  foreign key (wallet_id) references public.business_credit_wallets(id) on delete restrict;

-- Service purchases are credit consumption, not a separate ledger type.
-- The existing CHECK constraint permits CONSUMPTION and rejects SERVICE_PURCHASE.
create or replace function public.purchase_platform_service_with_credits(
  p_service_id uuid,
  p_business_id uuid,
  p_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
  if auth.uid() is null or p_user_id <> auth.uid() then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_service from public.platform_services where id=p_service_id and active=true;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  if v_service.price is null or v_service.price <= 0 then raise exception 'SERVICE_NOT_PRICED'; end if;

  if not exists(select 1 from public.businesses where id=p_business_id and owner_id=p_user_id)
  and not exists(select 1 from public.business_members where business_id=p_business_id and user_id=p_user_id and role in ('owner','admin','operator')) then
    raise exception 'FORBIDDEN';
  end if;

  v_credits:=ceil(v_service.price)::integer;
  select * into v_wallet from public.business_credit_wallets where business_id=p_business_id for update;
  if not found then raise exception 'NO_WALLET'; end if;
  if v_wallet.balance_credits < v_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;

  v_renewal_period := case
    when v_service.billing = 'MONTHLY' then 'MONTHLY'
    when v_service.billing = 'ANNUAL' then 'ANNUAL'
    else null
  end;

  v_ends_at := case
    when v_service.billing = 'MONTHLY' then v_starts_at + interval '1 month'
    when v_service.billing = 'ANNUAL' then v_starts_at + interval '1 year'
    when v_service.default_term_days is not null then v_starts_at + make_interval(days => v_service.default_term_days)
    else null
  end;

  v_renewal_status := case when v_renewal_period is null then 'NONE' else 'ACTIVE' end;

  update public.business_credit_wallets
    set balance_credits=balance_credits-v_credits,updated_at=now()
    where id=v_wallet.id;

  insert into public.platform_service_orders(
    service_id,business_id,requester_user_id,amount_mzn,currency,payment_method,
    credits_charged,status,starts_at,ends_at,renewal_period,auto_renew,renewal_status
  )
  values(
    v_service.id,p_business_id,p_user_id,v_service.price,coalesce(v_service.currency,'MZN'),
    'CREDITS',v_credits,'PAID',v_starts_at,v_ends_at,v_renewal_period,false,v_renewal_status
  ) returning id into v_order_id;

  if v_renewal_period is not null then
    insert into public.platform_service_subscriptions(
      service_id,business_id,current_order_id,status,starts_at,ends_at,
      renewal_period,auto_renew,next_renewal_at
    )
    values(
      v_service.id,p_business_id,v_order_id,'ACTIVE',v_starts_at,v_ends_at,
      v_renewal_period,false,v_ends_at
    )
    returning id into v_subscription_id;
  end if;

  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
  values(v_wallet.id,'CONSUMPTION',-v_credits,v_service.price,'PLATFORM_SERVICE_ORDER',v_order_id,'Compra de serviço: '||v_service.name);

  insert into public.financial_documents(
    business_id,user_id,document_type,document_number,status,amount_mzn,currency,
    reference_type,reference_id,due_at,metadata
  )
  values(
    p_business_id,p_user_id,'INVOICE',
    'INV-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(v_order_id::text,'-',''),1,8),
    'PAID',v_service.price,coalesce(v_service.currency,'MZN'),
    'PLATFORM_SERVICE_ORDER',v_order_id,v_ends_at,
    jsonb_build_object('subscription_id',v_subscription_id,'renewal_period',v_renewal_period)
  );

  return v_order_id;
end
$$;

create or replace function public.admin_credit_financial_report(
  p_from date default null,
  p_to date default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_from date := coalesce(p_from, date_trunc('month', current_date)::date);
  v_to date := coalesce(p_to, current_date);
  v_result jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.platform_members pm
    where pm.user_id=v_actor and pm.active=true and pm.role='super_admin'
  ) then raise exception 'FORBIDDEN'; end if;

  if v_from is null or v_to is null or v_from > v_to or v_to - v_from > 365 then
    raise exception 'INVALID_REPORT_PERIOD';
  end if;

  with wallet_ledger as (
    select
      w.id as wallet_id,
      w.business_id,
      b.name as business_name,
      w.balance_credits,
      coalesce(sum(t.credits),0)::bigint as ledger_balance,
      count(t.id)::bigint as transaction_count
    from public.business_credit_wallets w
    join public.businesses b on b.id=w.business_id
    left join public.credit_transactions t on t.wallet_id=w.id
    group by w.id,b.name
  ),
  mismatches as (
    select * from wallet_ledger where balance_credits::bigint <> ledger_balance
  ),
  ledger_period as (
    select
      coalesce(t.type,'UNKNOWN') as type,
      coalesce(t.reference_type,'UNCLASSIFIED') as reference_type,
      count(*)::bigint as transaction_count,
      coalesce(sum(t.credits),0)::bigint as credits_delta,
      coalesce(sum(t.amount_mzn),0)::numeric as amount_mzn
    from public.credit_transactions t
    where t.created_at >= v_from::timestamptz
      and t.created_at < (v_to + 1)::timestamptz
    group by t.type,t.reference_type
  ),
  paid_period as (
    select count(*)::bigint as purchase_count,
      coalesce(sum(r.amount_mzn),0)::numeric as received_mzn,
      coalesce(sum(r.credits),0)::bigint as credits_sold
    from public.credit_purchase_requests r
    where r.status='PAID'
      and coalesce(r.payment_confirmed_at,r.updated_at,r.created_at) >= v_from::timestamptz
      and coalesce(r.payment_confirmed_at,r.updated_at,r.created_at) < (v_to + 1)::timestamptz
  ),
  pending as (
    select count(*)::bigint as request_count,
      coalesce(sum(r.amount_mzn),0)::numeric as amount_mzn,
      coalesce(sum(r.credits),0)::bigint as credits
    from public.credit_purchase_requests r
    where r.status in ('REQUESTED','PAYMENT_PENDING')
  ),
  callbacks as (
    select
      count(*)::bigint as event_count,
      count(*) filter (where processing_status in ('REJECTED','RETRY'))::bigint as needs_review,
      count(*) filter (where processing_status='PROCESSED')::bigint as processed,
      coalesce(sum(delivery_count-1),0)::bigint as repeated_deliveries
    from public.credit_payment_callback_events
    where last_received_at >= v_from::timestamptz
      and last_received_at < (v_to + 1)::timestamptz
  ),
  ledger_groups as (
    select jsonb_agg(jsonb_build_object(
      'type',type,'reference_type',reference_type,
      'transaction_count',transaction_count,'credits_delta',credits_delta,
      'amount_mzn',amount_mzn
    ) order by type,reference_type) as items
    from ledger_period
  ),
  mismatch_rows as (
    select jsonb_agg(jsonb_build_object(
      'wallet_id',wallet_id,'business_id',business_id,'business_name',business_name,
      'balance_credits',balance_credits,'ledger_balance',ledger_balance,
      'difference',balance_credits::bigint-ledger_balance,
      'transaction_count',transaction_count
    ) order by business_name) as items
    from mismatches
  ),
  wallet_totals as (
    select count(*)::bigint as wallet_count,
      coalesce(sum(balance_credits),0)::bigint as current_balance,
      coalesce(sum(ledger_balance),0)::bigint as ledger_balance,
      count(*) filter (where balance_credits::bigint<>ledger_balance)::bigint as mismatch_count
    from wallet_ledger
  )
  select jsonb_build_object(
    'period',jsonb_build_object('from',v_from,'to',v_to),
    'wallets',(select to_jsonb(wallet_totals) from wallet_totals),
    'reconciliation',jsonb_build_object(
      'mismatch_count',(select mismatch_count from wallet_totals),
      'mismatches',coalesce((select items from mismatch_rows),'[]'::jsonb)
    ),
    'purchases',(select to_jsonb(paid_period) from paid_period),
    'pending',(select to_jsonb(pending) from pending),
    'ledger_movements',coalesce((select items from ledger_groups),'[]'::jsonb),
    'callbacks',(select to_jsonb(callbacks) from callbacks)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_credit_financial_report(date,date) from public, anon, authenticated;
grant execute on function public.admin_credit_financial_report(date,date) to authenticated;
