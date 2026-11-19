-- F3.10: transactional service-order cancellation and compensating refund ledger.
create table if not exists public.platform_service_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.platform_service_orders(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('CREDIT_REFUND','MPESA_REFUND','PAYMENT_CANCELLATION')),
  amount_mzn numeric not null check (amount_mzn >= 0),
  credits integer not null default 0,
  currency text not null default 'MZN',
  original_payment_id uuid references public.financial_payments(id) on delete restrict,
  external_refund_reference text,
  reason text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint platform_service_adjustments_one_per_order unique(order_id),
  constraint platform_service_adjustments_external_ref_unique unique(external_refund_reference)
);
alter table public.platform_service_adjustments enable row level security;
revoke all on public.platform_service_adjustments from public,anon;
grant select on public.platform_service_adjustments to authenticated;
grant all on public.platform_service_adjustments to service_role;
drop policy if exists "business members read own service adjustments" on public.platform_service_adjustments;
create policy "business members read own service adjustments" on public.platform_service_adjustments for select to authenticated
using (exists(select 1 from public.businesses b where b.id=platform_service_adjustments.business_id and b.owner_id=(select auth.uid())) or exists(select 1 from public.business_members bm where bm.business_id=platform_service_adjustments.business_id and bm.user_id=(select auth.uid()) and bm.role in ('owner','admin','operator')));
create or replace function public.prevent_platform_service_adjustment_mutation()
returns trigger language plpgsql set search_path=public,pg_temp as $function$
begin raise exception 'SERVICE_ADJUSTMENT_IMMUTABLE'; end $function$;
drop trigger if exists platform_service_adjustments_immutable on public.platform_service_adjustments;
create trigger platform_service_adjustments_immutable before update or delete on public.platform_service_adjustments for each row execute function public.prevent_platform_service_adjustment_mutation();

create or replace function public.admin_cancel_platform_service_order(p_order_id uuid,p_reason text,p_external_refund_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $function$
declare
 v_order public.platform_service_orders%rowtype; v_payment public.financial_payments%rowtype; v_wallet public.business_credit_wallets%rowtype;
 v_actor uuid:=auth.uid(); v_adjustment_id uuid; v_type text; v_ref text:=nullif(btrim(p_external_refund_reference),''); v_reason text:=nullif(btrim(p_reason),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if p_order_id is null or v_reason is null or length(v_reason)<8 or length(v_reason)>1000 then raise exception 'INVALID_ADJUSTMENT_REASON'; end if;
 select * into v_order from public.platform_service_orders where id=p_order_id for update;
 if not found then raise exception 'SERVICE_ORDER_NOT_FOUND'; end if;
 if v_order.status='COMPLETED' then raise exception 'COMPLETED_ORDER_NOT_REVERSIBLE'; end if;
 if v_order.status='CANCELLED' then raise exception 'ORDER_ALREADY_CANCELLED'; end if;
 if v_order.status='FAILED' then raise exception 'FAILED_ORDER_NOT_CANCELLABLE'; end if;
 if exists(select 1 from public.platform_service_adjustments a where a.order_id=v_order.id) then raise exception 'ORDER_ALREADY_ADJUSTED'; end if;
 if v_order.payment_method='CREDITS' then
  if v_order.status not in ('PAID','PROCESSING') or coalesce(v_order.credits_charged,0)<=0 then raise exception 'CREDIT_ORDER_NOT_REFUNDABLE'; end if;
  select * into v_wallet from public.business_credit_wallets where business_id=v_order.business_id for update;
  if not found then raise exception 'CREDIT_WALLET_NOT_FOUND'; end if;
  update public.business_credit_wallets set balance_credits=balance_credits+v_order.credits_charged,updated_at=now() where id=v_wallet.id;
  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description) values(v_wallet.id,'REFUND',v_order.credits_charged,v_order.amount_mzn,'PLATFORM_SERVICE_ORDER',v_order.id,'Estorno de créditos por cancelamento administrativo: '||left(v_reason,500));
  v_type:='CREDIT_REFUND';
 elsif v_order.payment_method='MPESA' then
  select * into v_payment from public.financial_payments where reference=coalesce(v_order.mpesa_reference,'SERVICE:'||v_order.id::text) and method='MPESA' for update;
  if not found then raise exception 'SERVICE_PAYMENT_NOT_FOUND'; end if;
  if v_order.status='PENDING_PAYMENT' and v_payment.status='PENDING' then
   update public.financial_payments set status='FAILED' where id=v_payment.id; v_type:='PAYMENT_CANCELLATION';
  elsif v_order.status in ('PAID','PROCESSING') and v_payment.status='CONFIRMED' then
   if v_ref is null or length(v_ref)<4 or length(v_ref)>160 then raise exception 'EXTERNAL_REFUND_REFERENCE_REQUIRED'; end if;
   if exists(select 1 from public.financial_payments where provider_transaction_id=v_ref) then raise exception 'REFUND_REFERENCE_CONFLICTS_WITH_PAYMENT'; end if;
   update public.financial_payments set status='REFUNDED' where id=v_payment.id; v_type:='MPESA_REFUND';
  else raise exception 'MPESA_ORDER_NOT_REVERSIBLE'; end if;
 else raise exception 'UNSUPPORTED_PAYMENT_METHOD'; end if;
 update public.platform_service_orders set status='CANCELLED',renewal_status='CANCELLED',auto_renew=false,updated_at=now() where id=v_order.id;
 update public.platform_service_subscriptions set status='CANCELLED',auto_renew=false,next_renewal_at=null,updated_at=now() where current_order_id=v_order.id and status in ('ACTIVE','PAST_DUE');
 update public.financial_documents set status='VOID',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('void_reason',v_reason,'voided_by',v_actor,'voided_at',now(),'adjustment_type',v_type) where reference_type='PLATFORM_SERVICE_ORDER' and reference_id=v_order.id and status in ('PAID','ISSUED');
 insert into public.platform_service_adjustments(order_id,business_id,adjustment_type,amount_mzn,credits,currency,original_payment_id,external_refund_reference,reason,actor_user_id)
 values(v_order.id,v_order.business_id,v_type,v_order.amount_mzn,case when v_type='CREDIT_REFUND' then v_order.credits_charged else 0 end,v_order.currency,v_payment.id,v_ref,v_reason,v_actor) returning id into v_adjustment_id;
 return jsonb_build_object('adjustment_id',v_adjustment_id,'order_id',v_order.id,'adjustment_type',v_type,'credits_refunded',case when v_type='CREDIT_REFUND' then v_order.credits_charged else 0 end);
end $function$;
revoke all on function public.admin_cancel_platform_service_order(uuid,text,text) from public,anon;
grant execute on function public.admin_cancel_platform_service_order(uuid,text,text) to authenticated;
