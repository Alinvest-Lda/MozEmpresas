-- F3.82: paid business M-Pesa campaigns require external refund evidence before cancellation.
alter table public.business_promotion_cancellations
  add column if not exists external_refund_reference text;
create unique index if not exists business_promotion_cancellations_external_refund_uidx
  on public.business_promotion_cancellations(external_refund_reference)
  where external_refund_reference is not null;

drop function if exists public.admin_cancel_business_promotion(uuid,text);

create or replace function public.admin_cancel_business_promotion(p_promotion_id uuid, p_reason text, p_external_refund_reference text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_promotion public.business_promotions;
  v_wallet public.business_credit_wallets;
  v_refund integer := 0;
  v_external_reference text := nullif(trim(coalesce(p_external_refund_reference,'')), '');
  v_reason text := nullif(trim(coalesce(p_reason,'')),'');
begin
  if v_actor is null or not exists (
    select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin'
  ) then raise exception 'FORBIDDEN'; end if;
  if p_promotion_id is null or v_reason is null or length(v_reason)<8 or length(v_reason)>500 then
    raise exception 'INVALID_CANCELLATION';
  end if;
  select * into v_promotion from public.business_promotions where id=p_promotion_id for update;
  if not found then raise exception 'PROMOTION_NOT_FOUND'; end if;
  if v_promotion.status='CANCELLED' then
    return jsonb_build_object('promotion_id',p_promotion_id,'status','CANCELLED','already_processed',true,'credits_refunded',0);
  end if;
  if v_promotion.status not in ('PENDING','ACTIVE') or v_promotion.starts_at is null or v_promotion.starts_at<=now() then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;
  if v_promotion.payment_method='CREDITS' then
    v_refund := coalesce(v_promotion.credits_charged,0);
    if v_refund<=0 then raise exception 'CREDIT_REFUND_NOT_AVAILABLE'; end if;
    select * into v_wallet from public.business_credit_wallets where business_id=v_promotion.business_id for update;
    if not found then raise exception 'WALLET_NOT_FOUND'; end if;
    update public.business_credit_wallets set balance_credits=balance_credits+v_refund,updated_at=now() where id=v_wallet.id;
    insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
    values (v_wallet.id,'REFUND',v_refund,coalesce(v_promotion.price_mzn,0),'BUSINESS_PROMOTION_CANCEL',v_promotion.id,'Estorno de publicidade cancelada antes do início');
  elsif v_promotion.payment_method='MPESA' then
    if v_promotion.paid_at is not null then
      if v_external_reference is null or length(v_external_reference)<4 or length(v_external_reference)>160 then
        raise exception 'MPESA_REFUND_REFERENCE_REQUIRED';
      end if;
      if v_external_reference=v_promotion.payment_reference then raise exception 'INVALID_MPESA_REFUND_REFERENCE'; end if;
      if exists(select 1 from public.business_promotion_cancellations where external_refund_reference=v_external_reference) then
        raise exception 'MPESA_REFUND_REFERENCE_ALREADY_USED';
      end if;
    elsif v_external_reference is not null then
      raise exception 'UNEXPECTED_MPESA_REFUND_REFERENCE';
    end if;
  else
    raise exception 'PAYMENT_METHOD_NOT_SUPPORTED';
  end if;
  update public.business_promotions set status='CANCELLED',updated_at=now() where id=v_promotion.id;
  insert into public.business_promotion_cancellations(promotion_id,business_id,payment_method,credits_refunded,reason,actor_user_id,external_refund_reference)
  values(v_promotion.id,v_promotion.business_id,coalesce(v_promotion.payment_method,'MPESA'),v_refund,v_reason,v_actor,v_external_reference);
  return jsonb_build_object('promotion_id',v_promotion.id,'status','CANCELLED','already_processed',false,'credits_refunded',v_refund);
end;
$$;
revoke all on function public.admin_cancel_business_promotion(uuid,text) from public,anon,authenticated;
revoke all on function public.admin_cancel_business_promotion(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_cancel_business_promotion(uuid,text,text) to authenticated;

create or replace function public.prevent_business_promotion_cancellation_mutation()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin raise exception 'BUSINESS_PROMOTION_CANCELLATION_IMMUTABLE' using errcode='23514'; end;
$$;
revoke all on function public.prevent_business_promotion_cancellation_mutation() from public,anon,authenticated;
drop trigger if exists business_promotion_cancellations_immutable on public.business_promotion_cancellations;
create trigger business_promotion_cancellations_immutable
before update or delete on public.business_promotion_cancellations
for each row execute function public.prevent_business_promotion_cancellation_mutation();
