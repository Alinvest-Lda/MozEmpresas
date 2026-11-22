-- F3.13: safe cancellation lifecycle for business ad promotions.
alter table public.business_promotions
  drop constraint if exists business_promotions_status_check;
alter table public.business_promotions
  add constraint business_promotions_status_check
  check (status = any (array['DRAFT','PENDING','ACTIVE','PAUSED','EXPIRED','CANCELLED']::text[]));

create table if not exists public.business_promotion_cancellations (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null unique references public.business_promotions(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  payment_method text not null check (payment_method in ('CREDITS','MPESA')),
  credits_refunded integer not null default 0 check (credits_refunded >= 0),
  reason text not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.business_promotion_cancellations enable row level security;
revoke all on public.business_promotion_cancellations from anon, authenticated;
grant select on public.business_promotion_cancellations to authenticated;
grant all on public.business_promotion_cancellations to service_role;
drop policy if exists "business members read own promotion cancellation" on public.business_promotion_cancellations;
create policy "business members read own promotion cancellation"
on public.business_promotion_cancellations for select to authenticated
using (
  exists (select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())
  or exists (select 1 from public.business_members bm where bm.business_id=business_id and bm.user_id=auth.uid() and bm.role in ('owner','admin','operator'))
  or exists (select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin')
);

create or replace function public.admin_cancel_business_promotion(p_promotion_id uuid, p_reason text)
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
    if v_promotion.status<>'PENDING' then raise exception 'MPESA_REFUND_REQUIRED'; end if;
  else
    raise exception 'PAYMENT_METHOD_NOT_SUPPORTED';
  end if;
  update public.business_promotions set status='CANCELLED',updated_at=now() where id=v_promotion.id;
  insert into public.business_promotion_cancellations(promotion_id,business_id,payment_method,credits_refunded,reason,actor_user_id)
  values(v_promotion.id,v_promotion.business_id,coalesce(v_promotion.payment_method,'MPESA'),v_refund,v_reason,v_actor);
  return jsonb_build_object('promotion_id',v_promotion.id,'status','CANCELLED','already_processed',false,'credits_refunded',v_refund);
end;
$$;
revoke all on function public.admin_cancel_business_promotion(uuid,text) from public,anon;
grant execute on function public.admin_cancel_business_promotion(uuid,text) to authenticated;
