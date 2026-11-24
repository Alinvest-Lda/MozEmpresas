-- M-Pesa status reconciliation for platform service orders.
alter table public.financial_payments
  add column if not exists mpesa_transaction_status text,
  add column if not exists mpesa_status_response_code text,
  add column if not exists mpesa_status_response_desc text,
  add column if not exists mpesa_status_checked_at timestamptz,
  add column if not exists mpesa_status_check_count integer not null default 0;

alter table public.financial_payments
  drop constraint if exists financial_payments_mpesa_transaction_status_check;

alter table public.financial_payments
  add constraint financial_payments_mpesa_transaction_status_check
  check (mpesa_transaction_status is null or mpesa_transaction_status in ('Completed','Cancelled','Expired','N/A'));

create or replace function public.record_mpesa_platform_service_status(
  p_payment_reference text,
  p_third_party_reference text,
  p_conversation_id text,
  p_transaction_status text,
  p_response_code text,
  p_response_desc text,
  p_checked_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_payment public.financial_payments%rowtype;
  v_order public.platform_service_orders%rowtype;
  v_status text := p_transaction_status;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_payment_reference is null or p_payment_reference !~ '^SERVICE:[0-9a-fA-F-]{36}$'
     or p_third_party_reference is null or length(p_third_party_reference) not between 3 and 20
     or p_transaction_status not in ('Completed','Cancelled','Expired','N/A')
     or p_response_code is null or length(p_response_code) > 80
     or p_response_desc is null or length(p_response_desc) > 500
     or p_checked_at is null then
    raise exception 'INVALID_MPESA_STATUS_DATA';
  end if;

  select * into v_payment from public.financial_payments
  where reference=p_payment_reference and method='MPESA' for update;
  if not found then raise exception 'SERVICE_PAYMENT_NOT_FOUND'; end if;
  if v_payment.mpesa_third_party_reference is distinct from p_third_party_reference
     or (p_conversation_id is not null and v_payment.mpesa_conversation_id is not null
         and v_payment.mpesa_conversation_id is distinct from p_conversation_id) then
    raise exception 'MPESA_STATUS_REFERENCE_MISMATCH';
  end if;

  select * into v_order from public.platform_service_orders
  where id=split_part(p_payment_reference,':',2)::uuid for update;
  if not found or v_order.business_id is distinct from v_payment.business_id then
    raise exception 'SERVICE_ORDER_NOT_FOUND';
  end if;

  if v_payment.status='CONFIRMED' or v_order.status in ('PAID','PROCESSING','COMPLETED') then
    update public.financial_payments
    set mpesa_transaction_status=v_status,
        mpesa_status_response_code=p_response_code,
        mpesa_status_response_desc=p_response_desc,
        mpesa_status_checked_at=p_checked_at,
        mpesa_status_check_count=mpesa_status_check_count+1
    where id=v_payment.id;
    return jsonb_build_object('already_settled',true,'order_id',v_order.id);
  end if;

  update public.financial_payments
  set mpesa_conversation_id=coalesce(mpesa_conversation_id,p_conversation_id),
      mpesa_transaction_status=v_status,
      mpesa_status_response_code=p_response_code,
      mpesa_status_response_desc=p_response_desc,
      mpesa_status_checked_at=p_checked_at,
      mpesa_status_check_count=mpesa_status_check_count+1
  where id=v_payment.id;

  if p_response_code <> 'INS-0' then
    return jsonb_build_object('updated',true,'settled',false,'provider_accepted',false,'order_id',v_order.id);
  end if;

  if v_status='Cancelled' or v_status='Expired' then
    if v_payment.status='PENDING' and v_order.status='PENDING_PAYMENT' then
      update public.financial_payments set status='FAILED' where id=v_payment.id;
      update public.platform_service_orders
      set status=case when v_status='Cancelled' then 'CANCELLED' else 'FAILED' end,
          renewal_status='NONE', updated_at=p_checked_at
      where id=v_order.id;
    end if;
    return jsonb_build_object('updated',true,'settled',false,'terminal',true,'order_id',v_order.id);
  end if;

  if v_status='Completed' then
    return jsonb_build_object(
      'updated',true,'settled',false,
      'requires_provider_transaction_id',v_payment.provider_transaction_id is null,
      'order_id',v_order.id
    );
  end if;
  return jsonb_build_object('updated',true,'settled',false,'pending',true,'order_id',v_order.id);
end
$function$;

revoke all on function public.record_mpesa_platform_service_status(text,text,text,text,text,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_mpesa_platform_service_status(text,text,text,text,text,text,timestamptz)
  to service_role;
