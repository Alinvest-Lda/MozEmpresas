-- F3.9 hardening: distinguish credit-funded orders and system callback actors.
create or replace function public.capture_platform_service_order_status()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if tg_op='INSERT' then
    insert into public.platform_service_order_events(order_id,business_id,previous_status,new_status,event_source,actor_user_id)
    values(new.id,new.business_id,null,new.status,
      case when new.payment_method='MPESA' then 'MPESA_CHECKOUT' else 'CREDIT_CHECKOUT' end,auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.platform_service_order_events(order_id,business_id,previous_status,new_status,event_source,actor_user_id)
    values(new.id,new.business_id,old.status,new.status,
      case when auth.uid() is null then 'SYSTEM' else 'APPLICATION' end,auth.uid());
  end if;
  return new;
end
$function$;
revoke all on function public.capture_platform_service_order_status() from public,anon,authenticated;
grant execute on function public.capture_platform_service_order_status() to service_role;

create or replace function public.admin_service_payment_reconciliation(p_limit integer default 100)
returns table(
  order_id uuid,business_id uuid,business_name text,service_name text,requester_user_id uuid,
  amount_mzn numeric,currency text,payment_method text,order_status text,payment_id uuid,
  payment_status text,payment_reference text,provider_transaction_id text,
  payment_confirmed_at timestamptz,created_at timestamptz,updated_at timestamptz,
  event_history jsonb,reconciliation_issue text
)
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
begin
  if auth.uid() is null or not exists(
    select 1 from public.platform_members pm
    where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin'
  ) then raise exception 'FORBIDDEN'; end if;
  return query
  select o.id,o.business_id,b.name,s.name,o.requester_user_id,o.amount_mzn,o.currency,
    o.payment_method,o.status,p.id,p.status,p.reference,p.provider_transaction_id,p.confirmed_at,
    o.created_at,o.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'previous_status',e.previous_status,'new_status',e.new_status,
      'event_source',e.event_source,'created_at',e.created_at
    ) order by e.created_at desc) from public.platform_service_order_events e where e.order_id=o.id),'[]'::jsonb),
    case
      when o.payment_method='MPESA' and p.id is null then 'MISSING_PAYMENT'
      when o.payment_method='MPESA' and p.id is not null and p.amount_mzn<>o.amount_mzn then 'AMOUNT_MISMATCH'
      when o.payment_method='MPESA' and p.id is not null and p.currency<>o.currency then 'CURRENCY_MISMATCH'
      when o.payment_method='MPESA' and o.status in ('PAID','PROCESSING','COMPLETED') and p.status is distinct from 'CONFIRMED' then 'ORDER_PAID_PAYMENT_NOT_CONFIRMED'
      when o.payment_method='MPESA' and o.status in ('PENDING_PAYMENT','FAILED','CANCELLED') and p.status='CONFIRMED' then 'PAYMENT_ORDER_STATE_MISMATCH'
      when o.payment_method='MPESA' and p.status='CONFIRMED' and (p.provider_transaction_id is null or p.confirmed_at is null) then 'MISSING_PROVIDER_CONFIRMATION'
      else null
    end
  from public.platform_service_orders o
  join public.businesses b on b.id=o.business_id
  join public.platform_services s on s.id=o.service_id
  left join public.financial_payments p on p.reference=coalesce(o.mpesa_reference,'SERVICE:'||o.id::text) and p.method='MPESA'
  order by o.created_at desc
  limit greatest(1,least(coalesce(p_limit,100),500));
end
$function$;
revoke all on function public.admin_service_payment_reconciliation(integer) from public,anon;
grant execute on function public.admin_service_payment_reconciliation(integer) to authenticated;
