-- F3.92: enforce a 24-hour confirmation window for advertising bank transfers.
-- Pending bank-transfer advertising payment rows expire after 24h; late confirmations are rejected.
-- Unactivated, paid partner campaigns whose bank-transfer payment is expired are refund/cancel eligible.
alter table public.financial_payments
  add column if not exists expires_at timestamptz;

create index if not exists financial_payments_pending_bank_transfer_expiry_idx
  on public.financial_payments(expires_at)
  where status='PENDING' and method='BANK_TRANSFER' and expires_at is not null;

-- Mark pending bank-transfer payment intents as 24h-lived at creation/update.
create or replace function public.set_bank_transfer_payment_expiry()
returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
  if new.method='BANK_TRANSFER' and new.status='PENDING' then
    if new.expires_at is null then new.expires_at:=coalesce(new.created_at,now())+interval '24 hours'; end if;
  elsif new.status<>'PENDING' or new.method<>'BANK_TRANSFER' then
    new.expires_at:=null;
  end if;
  return new;
end $$;
revoke all on function public.set_bank_transfer_payment_expiry() from public,anon,authenticated;
drop trigger if exists financial_payment_bank_transfer_expiry on public.financial_payments;
create trigger financial_payment_bank_transfer_expiry
before insert or update of status,method,created_at,expires_at on public.financial_payments
for each row execute function public.set_bank_transfer_payment_expiry();

-- Existing pending transfer records get a deterministic expiry anchored at their creation time.
update public.financial_payments
set expires_at=created_at+interval '24 hours'
where status='PENDING' and method='BANK_TRANSFER' and expires_at is null;

-- Bank-transfer settlement is time-limited. Confirmation outside the 24h window
-- must not mutate settlement/document/campaign state.
create or replace function public.admin_confirm_partner_bank_transfer(p_payment_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $function$
declare
 v_payment public.financial_payments%rowtype;
 v_campaign_total numeric(14,2); v_campaign_price numeric(14,2); v_campaign_status text; v_campaign_account uuid;
 v_document_amount numeric(14,2); v_document_paid numeric(14,2); v_document_status text; v_document_account uuid;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into v_payment from public.financial_payments where id=p_payment_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.method<>'BANK_TRANSFER' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if v_payment.status<>'PENDING' then raise exception 'PAYMENT_NOT_PENDING'; end if;
 if v_payment.expires_at is null or v_payment.expires_at<=now() then raise exception 'BANK_TRANSFER_CONFIRMATION_EXPIRED'; end if;
 if length(trim(coalesce(p_notes,'')))>500 then raise exception 'INVALID_SETTLEMENT_NOTES'; end if;
 if v_payment.document_id is not null then
  select amount_mzn,status,partner_account_id into v_document_amount,v_document_status,v_document_account
  from public.financial_documents where id=v_payment.document_id for update;
  if not found then raise exception 'FINANCIAL_DOCUMENT_NOT_FOUND'; end if;
  if v_document_account is distinct from v_payment.partner_account_id then raise exception 'FINANCIAL_DOCUMENT_PARTNER_MISMATCH'; end if;
 end if;
 update public.financial_payments set status='CONFIRMED',verified_by=auth.uid(),verified_at=now(),
  confirmed_at=now(),verification_notes=nullif(trim(p_notes),'') where id=p_payment_id;
 if v_payment.document_id is not null and v_document_status<>'VOID' then
  select coalesce(sum(amount_mzn),0) into v_document_paid from public.financial_payments where document_id=v_payment.document_id and status='CONFIRMED';
  if v_document_paid>=v_document_amount and v_document_status='ISSUED' then update public.financial_documents set status='PAID' where id=v_payment.document_id; end if;
 end if;
 if v_payment.campaign_id is not null then
  select price_mzn,status,account_id into v_campaign_price,v_campaign_status,v_campaign_account
  from public.partner_ad_campaigns where id=v_payment.campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign_account is distinct from v_payment.partner_account_id then raise exception 'CAMPAIGN_PARTNER_MISMATCH'; end if;
  select coalesce(sum(amount_mzn),0) into v_campaign_total from public.financial_payments where campaign_id=v_payment.campaign_id and status='CONFIRMED';
  if v_campaign_total>=v_campaign_price and v_campaign_status='REQUESTED' then update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=v_payment.campaign_id; end if;
 end if;
 return jsonb_build_object('payment_id',p_payment_id,'status','CONFIRMED','campaign_id',v_payment.campaign_id,
  'campaign_paid_amount',coalesce(v_campaign_total,0),'campaign_price',v_campaign_price,
  'document_id',v_payment.document_id,'document_paid_amount',coalesce(v_document_paid,0),'document_amount',v_document_amount,
  'expires_at',v_payment.expires_at);
end;
$function$;
revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;

-- Allow cancellation/refund of a paid, approved bank-transfer campaign only
-- after 24 hours have elapsed from confirmed settlement, if it was not activated.
create or replace function public.admin_cancel_partner_ad_campaign(p_campaign_id uuid,p_reason text,p_external_refund_reference text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $function$
declare
 v_actor uuid:=auth.uid(); v_campaign public.partner_ad_campaigns%rowtype; v_order public.partner_ad_payment_orders%rowtype;
 v_wallet public.business_credit_wallets%rowtype; v_adjustment uuid; v_reference text:=nullif(trim(coalesce(p_external_refund_reference,'')));
 v_paid_at timestamptz; v_activation_deadline timestamptz;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_reason,''))) not between 8 and 1000 then raise exception 'INVALID_CANCELLATION_REASON'; end if;
 select * into v_campaign from public.partner_ad_campaigns where id=p_campaign_id for update;
 if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
 if v_campaign.status not in ('APPROVED','ACTIVE','PAUSED') then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;
 select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
 if not found or v_order.status<>'PAID' then raise exception 'CAMPAIGN_NOT_SETTLED'; end if;
 if exists(select 1 from public.partner_ad_payment_adjustments where order_id=v_order.id) then raise exception 'CAMPAIGN_ALREADY_REFUNDED'; end if;
 if v_order.payment_method='BANK_TRANSFER' and v_campaign.status='APPROVED' then
   select coalesce(fp.confirmed_at,fp.verified_at,fp.created_at) into v_paid_at
   from public.financial_payments fp where fp.id=v_order.financial_payment_id and fp.status in ('CONFIRMED','REFUNDED');
   v_activation_deadline:=v_paid_at+interval '24 hours';
   if v_paid_at is null or now()<v_activation_deadline then raise exception 'BANK_TRANSFER_ACTIVATION_WINDOW_NOT_EXPIRED'; end if;
 elsif v_campaign.starts_at is not null and v_campaign.starts_at<=now()
   and not (v_campaign.status='APPROVED' and v_campaign.ends_at is not null and v_campaign.ends_at<=now()) then
  raise exception 'CANCELLATION_NOT_ALLOWED';
 end if;
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
 return jsonb_build_object('adjustment_id',v_adjustment,'refund_type',case when v_order.payment_method='CREDITS' then 'CREDIT_REFUND' when v_order.payment_method='MPESA' then 'MPESA_REFUND' else 'BANK_TRANSFER_REFUND' end,'credits_refunded',v_order.credits_charged,'external_reference',v_reference,'activation_deadline',v_activation_deadline);
end; $function$;
revoke all on function public.admin_cancel_partner_ad_campaign(uuid,text,text) from public,anon;
grant execute on function public.admin_cancel_partner_ad_campaign(uuid,text,text) to authenticated;

-- Public advertiser requests also expire for bank-transfer confirmation after 24h.
do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,
  'if p_new_status=''PAID'' then',
  'if p_new_status=''PAID'' then if p_payment_method=''BANK_TRANSFER'' and exists(select 1 from public.advertising_requests ar where ar.id=p_entity_id and ar.created_at+interval ''24 hours''<=now()) then raise exception ''BANK_TRANSFER_CONFIRMATION_EXPIRED'' using errcode=''23514''; end if;');
 if position('BANK_TRANSFER_CONFIRMATION_EXPIRED' in v_definition)=0 then raise exception 'F392_REQUEST_CONFIRMATION_GUARD_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;

-- Manual credit-purchase bank transfer confirmations also expire after 24h.
do $migration$
declare v_definition text;
begin
 select pg_get_functiondef('public.admin_decide_credit_purchase(uuid,text,text)'::regprocedure) into v_definition;
 v_definition:=replace(v_definition,
  'if p_decision = ''REJECT'' then',
  'if p_decision = ''APPROVE'' and v_request.payment_method=''BANK_TRANSFER'' and v_request.created_at+interval ''24 hours''<=now() then raise exception ''BANK_TRANSFER_CONFIRMATION_EXPIRED''; end if; if p_decision = ''REJECT'' then');
 if position('BANK_TRANSFER_CONFIRMATION_EXPIRED' in v_definition)=0 then raise exception 'F392_CREDIT_CONFIRMATION_GUARD_REWRITE_FAILED'; end if;
 execute v_definition;
end
$migration$;
