-- F3.8 follow-up: record terminal non-success M-Pesa service callbacks without downgrading paid orders.
create or replace function public.record_mpesa_platform_service_failure(
  p_payment_reference text,
  p_provider_transaction_id text,
  p_amount_mzn numeric,
  p_currency text,
  p_callback_status text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_payment public.financial_payments%rowtype;
  v_order public.platform_service_orders%rowtype;
begin
  if p_payment_reference is null or p_payment_reference !~ '^SERVICE:[0-9a-fA-F-]{36}$'
     or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 3 and 160
     or p_amount_mzn is null or p_amount_mzn<=0 or p_currency<>'MZN'
     or p_callback_status not in ('FAILED','CANCELLED') then
    raise exception 'INVALID_SERVICE_CALLBACK';
  end if;
  select * into v_payment from public.financial_payments
  where reference=p_payment_reference and method='MPESA' for update;
  if not found then raise exception 'SERVICE_PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.platform_service_orders
  where id=split_part(p_payment_reference,':',2)::uuid for update;
  if not found or v_order.business_id<>v_payment.business_id then raise exception 'SERVICE_ORDER_NOT_FOUND'; end if;
  if v_payment.amount_mzn<>p_amount_mzn or v_payment.currency<>p_currency
     or v_order.amount_mzn<>p_amount_mzn or v_order.currency<>p_currency then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;
  if v_payment.status='CONFIRMED' or v_order.status in ('PAID','PROCESSING','COMPLETED') then
    return jsonb_build_object('ignored',true,'reason','ALREADY_SETTLED','order_id',v_order.id);
  end if;
  if v_payment.status='PENDING' and v_order.status='PENDING_PAYMENT' then
    update public.financial_payments set status='FAILED' where id=v_payment.id;
    update public.platform_service_orders
      set status=case when p_callback_status='CANCELLED' then 'CANCELLED' else 'FAILED' end,
          renewal_status='NONE',updated_at=now()
    where id=v_order.id;
    return jsonb_build_object('ignored',false,'order_id',v_order.id);
  end if;
  return jsonb_build_object('ignored',true,'reason','NOT_PENDING','order_id',v_order.id);
end
$function$;
revoke all on function public.record_mpesa_platform_service_failure(text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.record_mpesa_platform_service_failure(text,text,numeric,text,text) to service_role;
