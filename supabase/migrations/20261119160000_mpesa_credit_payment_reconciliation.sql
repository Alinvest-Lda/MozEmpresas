-- F3.1: payment references and idempotent M-Pesa confirmation ledger.
alter table public.credit_purchase_requests
  add column if not exists payment_reference text,
  add column if not exists provider_transaction_id text,
  add column if not exists payment_confirmed_at timestamptz;

create unique index if not exists credit_purchase_requests_payment_reference_uidx
  on public.credit_purchase_requests (payment_reference)
  where payment_reference is not null;

create unique index if not exists credit_purchase_requests_provider_transaction_uidx
  on public.credit_purchase_requests (provider_transaction_id)
  where provider_transaction_id is not null;

create table if not exists public.credit_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('MPESA')),
  provider_transaction_id text not null,
  payment_reference text not null,
  request_id uuid not null references public.credit_purchase_requests(id) on delete restrict,
  amount_mzn numeric(14,2) not null check (amount_mzn > 0),
  currency text not null check (currency = 'MZN'),
  event_type text not null check (event_type in ('PAYMENT_CONFIRMED')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint credit_payment_events_provider_tx_unique unique (provider, provider_transaction_id)
);

alter table public.credit_payment_events enable row level security;
revoke all on public.credit_payment_events from anon, authenticated;
grant select, insert on public.credit_payment_events to service_role;

create or replace function public.confirm_mpesa_credit_purchase(
  p_payment_reference text,
  p_provider_transaction_id text,
  p_amount_mzn numeric,
  p_currency text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.credit_purchase_requests;
  v_wallet public.business_credit_wallets;
  v_existing public.credit_payment_events;
  v_inserted_id uuid;
  v_tx text := nullif(trim(coalesce(p_provider_transaction_id, '')), '');
  v_ref text := nullif(trim(coalesce(p_payment_reference, '')), '');
  v_currency text := upper(trim(coalesce(p_currency, '')));
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  if v_ref is null or length(v_ref) > 100 or v_tx is null or length(v_tx) > 160
     or p_amount_mzn is null or p_amount_mzn <= 0 or v_currency <> 'MZN' then
    raise exception 'INVALID_PAYMENT_DATA';
  end if;

  select * into v_request
  from public.credit_purchase_requests
  where payment_reference = v_ref
  for update;
  if not found then raise exception 'PAYMENT_REFERENCE_NOT_FOUND'; end if;

  if p_amount_mzn <> v_request.amount_mzn then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if v_request.status = 'PAID' and v_request.provider_transaction_id = v_tx then
    return jsonb_build_object('ok', true, 'already_processed', true, 'request_id', v_request.id);
  end if;
  if v_request.status not in ('REQUESTED', 'PAYMENT_PENDING') then
    raise exception 'PURCHASE_NOT_PAYABLE';
  end if;

  insert into public.credit_payment_events
    (provider, provider_transaction_id, payment_reference, request_id, amount_mzn, currency, event_type, payload)
  values
    ('MPESA', v_tx, v_ref, v_request.id, p_amount_mzn, 'MZN', 'PAYMENT_CONFIRMED',
     coalesce(p_payload, '{}'::jsonb))
  on conflict (provider, provider_transaction_id) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    select * into v_existing from public.credit_payment_events
    where provider = 'MPESA' and provider_transaction_id = v_tx;
    if v_existing.payment_reference = v_ref
       and v_existing.request_id = v_request.id
       and v_existing.amount_mzn = p_amount_mzn
       and v_existing.currency = 'MZN' then
      return jsonb_build_object('ok', true, 'already_processed', true, 'request_id', v_request.id);
    end if;
    raise exception 'PROVIDER_TRANSACTION_ALREADY_USED';
  end if;

  insert into public.business_credit_wallets (business_id, balance_credits)
  values (v_request.business_id, 0)
  on conflict (business_id) do nothing;

  select * into v_wallet from public.business_credit_wallets
  where business_id = v_request.business_id
  for update;
  if not found then raise exception 'WALLET_UNAVAILABLE'; end if;

  update public.business_credit_wallets
    set balance_credits = balance_credits + v_request.credits,
        updated_at = now()
    where id = v_wallet.id;

  insert into public.credit_transactions
    (wallet_id, package_id, type, credits, amount_mzn, reference_type, reference_id, description)
  values
    (v_wallet.id, v_request.package_id, 'PURCHASE', v_request.credits, v_request.amount_mzn,
     'CREDIT_PURCHASE_REQUEST', v_request.id,
     'Compra M-Pesa confirmada · pedido ' || v_request.id::text);

  update public.credit_purchase_requests
    set status = 'PAID',
        payment_method = 'MPESA',
        provider_transaction_id = v_tx,
        payment_confirmed_at = now(),
        updated_at = now()
    where id = v_request.id;

  return jsonb_build_object('ok', true, 'already_processed', false,
    'request_id', v_request.id, 'credits_added', v_request.credits);
end;
$$;

revoke all on function public.confirm_mpesa_credit_purchase(text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.confirm_mpesa_credit_purchase(text, text, numeric, text, jsonb)
  to service_role;
