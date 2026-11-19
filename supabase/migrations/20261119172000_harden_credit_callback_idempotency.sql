create or replace function public.record_credit_payment_callback(
  p_provider_transaction_id text,
  p_payment_reference text,
  p_amount_mzn numeric,
  p_currency text,
  p_merchant_code text,
  p_callback_status text,
  p_received_at timestamptz
) returns public.credit_payment_callback_events
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event public.credit_payment_callback_events;
begin
  if p_provider_transaction_id is null or length(p_provider_transaction_id) not between 3 and 160
     or p_payment_reference is null or length(p_payment_reference) not between 4 and 100
     or p_amount_mzn is null or p_amount_mzn <= 0
     or p_currency <> 'MZN'
     or p_merchant_code is null or length(p_merchant_code) not between 2 and 80
     or p_callback_status not in ('SUCCESS','PENDING','FAILED','CANCELLED')
     or p_received_at is null then
    raise exception 'INVALID_CALLBACK_AUDIT_DATA';
  end if;

  insert into public.credit_payment_callback_events (
    provider, provider_transaction_id, payment_reference, amount_mzn, currency,
    merchant_code, callback_status, processing_status, first_received_at, last_received_at
  ) values (
    'MPESA', p_provider_transaction_id, p_payment_reference, p_amount_mzn, p_currency,
    p_merchant_code, p_callback_status, 'RECEIVED', p_received_at, p_received_at
  )
  on conflict (provider, provider_transaction_id, callback_status)
  do update set
    delivery_count = public.credit_payment_callback_events.delivery_count + 1,
    last_received_at = greatest(public.credit_payment_callback_events.last_received_at, excluded.last_received_at),
    processing_status = case
      when public.credit_payment_callback_events.processing_status = 'PROCESSED' then 'PROCESSED'
      else 'RECEIVED'
    end,
    processing_error_code = case
      when public.credit_payment_callback_events.processing_status = 'PROCESSED' then null
      else public.credit_payment_callback_events.processing_error_code
    end,
    processed_at = case
      when public.credit_payment_callback_events.processing_status = 'PROCESSED' then public.credit_payment_callback_events.processed_at
      else null
    end
  where public.credit_payment_callback_events.payment_reference = excluded.payment_reference
    and public.credit_payment_callback_events.amount_mzn = excluded.amount_mzn
    and public.credit_payment_callback_events.currency = excluded.currency
    and public.credit_payment_callback_events.merchant_code = excluded.merchant_code
  returning * into v_event;

  if not found then
    raise exception 'CALLBACK_TRANSACTION_CONFLICT';
  end if;
  return v_event;
end;
$$;

revoke all on function public.record_credit_payment_callback(text,text,numeric,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.record_credit_payment_callback(text,text,numeric,text,text,text,timestamptz) to service_role;
