-- F3.83: allow refund/cancellation of approved partner campaigns that expired without activation.
create or replace function public.admin_cancel_partner_ad_campaign(p_campaign_id uuid,p_reason text,p_external_refund_reference text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare
 v_actor uuid:=auth.uid(); v_campaign public.partner_ad_campaigns%rowtype; v_order public.partner_ad_payment_orders%rowtype;
 v_wallet public.business_credit_wallets%rowtype; v_adjustment uuid; v_reference text:=nullif(trim(coalesce(p_external_refund_reference,'')),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_reason,''))) not between 8 and 1000 then raise exception 'INVALID_CANCELLATION_REASON'; end if;
 select * into v_campaign from public.partner_ad_campaigns where id=p_campaign_id for update;
 if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
 if v_campaign.status not in ('APPROVED','ACTIVE','PAUSED') then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;
 if v_campaign.starts_at is not null and v_campaign.starts_at<=now()
   and not (v_campaign.status='APPROVED' and v_campaign.ends_at is not null and v_campaign.ends_at<=now()) then
  raise exception 'CANCELLATION_NOT_ALLOWED';
 end if;
 select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
 if not found or v_order.status<>'PAID' then raise exception 'CAMPAIGN_NOT_SETTLED'; end if;
 if exists(select 1 from public.partner_ad_payment_adjustments where order_id=v_order.id) then raise exception 'CAMPAIGN_ALREADY_REFUNDED'; end if;
 if v_order.payment_method='CREDITS' then
  if v_order.business_id is null then raise exception 'PARTNER_CREDIT_WALLET_NOT_LINKED'; end if;
  select * into v_wallet from public.business_credit_wallets where business_id=v_order.business_id for update;
  if not found then raise exception 'PARTNER_CREDIT_WALLET_NOT_FOUND'; end if;
  update public.business_credit_wallets set balance_credits=balance_credits+v_order.credits_charged,updated_at=now() where id=v_wallet.id;
  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description) values(v_wallet.id,'REFUND',v_order.credits_charged,v_order.amount_mzn,'PARTNER_AD_CAMPAIGN',p_campaign_id,'Estorno de publicidade: '||v_campaign.title);
  insert into public.partner_ad_payment_adjustments(order_id,campaign_id,account_id,adjustment_type,amount_mzn,credits,reason,actor_user_id) values(v_order.id,p_campaign_id,v_order.account_id,'CREDIT_REFUND',v_order.amount_mzn,v_order.credits_charged,trim(p_reason),v_actor) returning id into v_adjustment;
 elsif v_order.payment_method in ('MPESA','BANK_TRANSFER') then
  if v_reference is null or length(v_reference)<4 or length(v_reference)>160 then raise exception 'EXTERNAL_REFUND_REFERENCE_REQUIRED'; end if;
  if v_reference in (v_order.provider_transaction_id,v_order.payment_reference) then raise exception 'INVALID_EXTERNAL_REFUND_REFERENCE'; end if;
  insert into public.partner_ad_payment_adjustments(order_id,campaign_id,account_id,adjustment_type,amount_mzn,credits,external_refund_reference,reason,actor_user_id)
  values(v_order.id,p_campaign_id,v_order.account_id,case when v_order.payment_method='MPESA' then 'MPESA_REFUND' else 'BANK_TRANSFER_REFUND' end,v_order.amount_mzn,0,v_reference,trim(p_reason),v_actor) returning id into v_adjustment;
 else raise exception 'UNSUPPORTED_PAYMENT_METHOD'; end if;
 update public.financial_payments set status='REFUNDED' where id=v_order.financial_payment_id and status='CONFIRMED';
 update public.financial_documents set status='VOID' where id=v_order.financial_document_id and status in ('ISSUED','PAID');
 update public.partner_ad_payment_orders set status='REFUNDED',external_refund_reference=v_reference,updated_at=now() where id=v_order.id;
 perform set_config('app.partner_ad_campaign_reason',trim(p_reason),true);
 update public.partner_ad_campaigns set status='CANCELLED',updated_at=now() where id=p_campaign_id;
 return jsonb_build_object('adjustment_id',v_adjustment,'refund_type',case when v_order.payment_method='CREDITS' then 'CREDIT_REFUND' when v_order.payment_method='MPESA' then 'MPESA_REFUND' else 'BANK_TRANSFER_REFUND' end,'credits_refunded',v_order.credits_charged,'external_reference',v_reference);
end; $$;
revoke all on function public.admin_cancel_partner_ad_campaign(uuid,text,text) from public,anon;
grant execute on function public.admin_cancel_partner_ad_campaign(uuid,text,text) to authenticated;
