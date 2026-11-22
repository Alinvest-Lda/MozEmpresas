
alter table public.partner_ad_payment_orders drop constraint if exists partner_ad_payment_orders_payment_method_check;
alter table public.partner_ad_payment_orders add constraint partner_ad_payment_orders_payment_method_check check(payment_method=any(array['MPESA','CREDITS','BANK_TRANSFER']));
alter table public.partner_ad_payment_adjustments drop constraint if exists partner_ad_payment_adjustments_adjustment_type_check;
alter table public.partner_ad_payment_adjustments add constraint partner_ad_payment_adjustments_adjustment_type_check check(adjustment_type=any(array['CREDIT_REFUND','MPESA_REFUND','BANK_TRANSFER_REFUND']));
alter table public.partner_ad_payment_adjustments drop constraint if exists partner_ad_payment_adjustments_check;
alter table public.partner_ad_payment_adjustments add constraint partner_ad_payment_adjustments_check check(
 (adjustment_type='CREDIT_REFUND' and credits>0 and external_refund_reference is null)
 or (adjustment_type in ('MPESA_REFUND','BANK_TRANSFER_REFUND') and credits=0 and external_refund_reference is not null));

create or replace function public.admin_create_partner_ad_campaign_bank_transfer(
 p_account_id uuid,p_product_id uuid,p_contract_id uuid,p_title text,p_objective text,p_starts_at timestamptz,p_ends_at timestamptz,p_price_mzn numeric,p_assigned_operations_user_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_product public.partner_ad_products%rowtype; v_campaign uuid; v_order uuid; v_reference text; v_existing integer;
begin
 if v_actor is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 if nullif(trim(coalesce(p_title,'')),'') is null or length(trim(p_title))>180 then raise exception 'INVALID_CAMPAIGN_TITLE'; end if;
 if p_price_mzn is null or p_price_mzn<=0 then raise exception 'INVALID_CAMPAIGN_PRICE'; end if;
 if p_starts_at is null or p_ends_at is null or p_starts_at<now() or p_ends_at<=p_starts_at then raise exception 'INVALID_CAMPAIGN_DATES'; end if;
 if not exists(select 1 from public.partner_accounts a where a.id=p_account_id and a.status='ACTIVE') then raise exception 'PARTNER_ACCOUNT_INACTIVE'; end if;
 if p_contract_id is not null and not exists(select 1 from public.partner_contracts c where c.id=p_contract_id and c.account_id=p_account_id) then raise exception 'CONTRACT_PARTNER_MISMATCH'; end if;
 if p_assigned_operations_user_id is not null and not exists(select 1 from public.platform_members pm where pm.user_id=p_assigned_operations_user_id and pm.active=true) then raise exception 'INVALID_OPERATIONS_ASSIGNEE'; end if;
 select * into v_product from public.partner_ad_products where id=p_product_id and active=true for update;
 if not found then raise exception 'AD_PRODUCT_NOT_AVAILABLE'; end if;
 if v_product.price_mzn is not null and v_product.price_mzn<>p_price_mzn then raise exception 'FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN'; end if;
 if extract(epoch from (p_ends_at-p_starts_at))/86400>v_product.duration_days then raise exception 'CAMPAIGN_EXCEEDS_PRODUCT_DURATION'; end if;
 select count(*) into v_existing from public.partner_ad_campaigns c where c.product_id=p_product_id and c.status in ('REQUESTED','APPROVED','ACTIVE','PAUSED') and c.starts_at<p_ends_at and c.ends_at>p_starts_at;
 if v_existing>=greatest(v_product.capacity,1) then raise exception 'AD_SPACE_UNAVAILABLE'; end if;
 insert into public.partner_ad_campaigns(account_id,product_id,contract_id,title,objective,starts_at,ends_at,price_mzn,status,request_source,created_by_internal_user_id,assigned_operations_user_id,surface,slot,creative_type,campaign_mode,priority,bid_mzn,frequency_cap,targeting,impression_goal,impressions_count,clicks_count,campaign_kind,bid_cpm,target_interests,target_locations,payment_method_preference)
 values(p_account_id,p_product_id,p_contract_id,trim(p_title),nullif(trim(p_objective),''),p_starts_at,p_ends_at,p_price_mzn,'REQUESTED','BACKOFFICE',v_actor,p_assigned_operations_user_id,v_product.surface,v_product.slot,'TEXT','GUARANTEED',70,0,2,'{}'::jsonb,null,0,0,'GUARANTEED',0,'{}'::text[],'{}'::text[],'MPESA') returning id into v_campaign;
 v_reference:='BACKOFFICE_PARTNER_AD:'||replace(gen_random_uuid()::text,'-','');
 insert into public.partner_ad_payment_orders(campaign_id,account_id,business_id,amount_mzn,payment_method,credits_charged,status,payment_reference,created_by)
 values(v_campaign,p_account_id,null,p_price_mzn,'BANK_TRANSFER',0,'PENDING',v_reference,v_actor) returning id into v_order;
 return jsonb_build_object('campaign_id',v_campaign,'order_id',v_order,'payment_reference',v_reference);
end; $$;
revoke all on function public.admin_create_partner_ad_campaign_bank_transfer(uuid,uuid,uuid,text,text,timestamptz,timestamptz,numeric,uuid) from public,anon;
grant execute on function public.admin_create_partner_ad_campaign_bank_transfer(uuid,uuid,uuid,text,text,timestamptz,timestamptz,numeric,uuid) to authenticated;

create or replace function public.admin_issue_partner_invoice(p_account_id uuid,p_contract_id uuid,p_engagement_id uuid,p_campaign_id uuid,p_document_number text,p_amount_mzn numeric)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_document uuid; v_order public.partner_ad_payment_orders%rowtype;
begin
 if v_actor is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 if p_amount_mzn is null or p_amount_mzn<=0 or length(trim(coalesce(p_document_number,'')))<3 then raise exception 'INVALID_INVOICE'; end if;
 if not exists(select 1 from public.partner_accounts a where a.id=p_account_id) then raise exception 'PARTNER_ACCOUNT_NOT_FOUND'; end if;
 if p_contract_id is not null and not exists(select 1 from public.partner_contracts c where c.id=p_contract_id and c.account_id=p_account_id) then raise exception 'CONTRACT_PARTNER_MISMATCH'; end if;
 if p_engagement_id is not null and not exists(select 1 from public.partner_service_engagements e where e.id=p_engagement_id and e.account_id=p_account_id) then raise exception 'ENGAGEMENT_PARTNER_MISMATCH'; end if;
 if p_campaign_id is not null then
  if not exists(select 1 from public.partner_ad_campaigns c where c.id=p_campaign_id and c.account_id=p_account_id) then raise exception 'CAMPAIGN_PARTNER_MISMATCH'; end if;
  select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
  if not found or v_order.status<>'PENDING' or v_order.payment_method<>'BANK_TRANSFER' then raise exception 'CAMPAIGN_PAYMENT_ORDER_NOT_PENDING'; end if;
  if v_order.financial_document_id is not null then raise exception 'CAMPAIGN_INVOICE_ALREADY_ISSUED'; end if;
  if v_order.amount_mzn<>p_amount_mzn then raise exception 'CAMPAIGN_INVOICE_AMOUNT_MISMATCH'; end if;
 end if;
 insert into public.financial_documents(partner_account_id,business_id,user_id,issued_by_internal_user_id,contract_id,engagement_id,campaign_id,document_type,document_number,status,amount_mzn,currency,reference_type,reference_id)
 values(p_account_id,null,v_actor,v_actor,p_contract_id,p_engagement_id,p_campaign_id,case when p_campaign_id is not null then 'AD_PURCHASE' else 'INVOICE' end,trim(p_document_number),'ISSUED',p_amount_mzn,'MZN',case when p_campaign_id is not null then 'PARTNER_AD_CAMPAIGN' else 'PARTNER_CONTRACT' end,coalesce(p_campaign_id,p_contract_id))
 returning id into v_document;
 if p_campaign_id is not null then update public.partner_ad_payment_orders set financial_document_id=v_document,updated_at=now() where id=v_order.id; end if;
 return v_document;
end; $$;
revoke all on function public.admin_issue_partner_invoice(uuid,uuid,uuid,uuid,text,numeric) from public,anon;
grant execute on function public.admin_issue_partner_invoice(uuid,uuid,uuid,uuid,text,numeric) to authenticated;

create or replace function public.admin_record_partner_bank_transfer(p_account_id uuid,p_amount_mzn numeric,p_reference text,p_bank_name text,p_payer_name text,p_transfer_date date,p_proof_url text,p_contract_id uuid,p_engagement_id uuid,p_campaign_id uuid,p_document_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_payment uuid; v_order public.partner_ad_payment_orders%rowtype; v_document public.financial_documents%rowtype;
begin
 if v_actor is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 if p_amount_mzn is null or p_amount_mzn<=0 or length(trim(coalesce(p_reference,'')))<3 then raise exception 'INVALID_BANK_TRANSFER'; end if;
 if not exists(select 1 from public.partner_accounts a where a.id=p_account_id and a.status='ACTIVE') then raise exception 'PARTNER_ACCOUNT_INACTIVE'; end if;
 if p_contract_id is not null and not exists(select 1 from public.partner_contracts c where c.id=p_contract_id and c.account_id=p_account_id) then raise exception 'CONTRACT_PARTNER_MISMATCH'; end if;
 if p_engagement_id is not null and not exists(select 1 from public.partner_service_engagements e where e.id=p_engagement_id and e.account_id=p_account_id) then raise exception 'ENGAGEMENT_PARTNER_MISMATCH'; end if;
 if p_campaign_id is not null then
  if not exists(select 1 from public.partner_ad_campaigns c where c.id=p_campaign_id and c.account_id=p_account_id) then raise exception 'CAMPAIGN_PARTNER_MISMATCH'; end if;
  select * into v_order from public.partner_ad_payment_orders where campaign_id=p_campaign_id for update;
  if not found or v_order.payment_method<>'BANK_TRANSFER' or v_order.status<>'PENDING' then raise exception 'CAMPAIGN_PAYMENT_ORDER_NOT_PENDING'; end if;
  if v_order.financial_payment_id is not null then raise exception 'CAMPAIGN_PAYMENT_ALREADY_RECORDED'; end if;
  if p_amount_mzn<>v_order.amount_mzn then raise exception 'CAMPAIGN_PAYMENT_MUST_BE_FULL'; end if;
 end if;
 if p_document_id is not null then
  select * into v_document from public.financial_documents where id=p_document_id for update;
  if not found or v_document.partner_account_id is distinct from p_account_id or v_document.status<>'ISSUED' then raise exception 'INVALID_PARTNER_INVOICE'; end if;
  if p_campaign_id is not null and (v_document.campaign_id is distinct from p_campaign_id or v_document.amount_mzn<>p_amount_mzn) then raise exception 'CAMPAIGN_INVOICE_MISMATCH'; end if;
 end if;
 insert into public.financial_payments(partner_account_id,business_id,user_id,contract_id,engagement_id,campaign_id,document_id,amount_mzn,currency,method,status,reference,bank_name,payer_name,transfer_date,proof_url)
 values(p_account_id,null,v_actor,p_contract_id,p_engagement_id,p_campaign_id,p_document_id,p_amount_mzn,'MZN','BANK_TRANSFER','PENDING',trim(p_reference),nullif(trim(p_bank_name),''),nullif(trim(p_payer_name),''),p_transfer_date,p_proof_url)
 returning id into v_payment;
 if p_campaign_id is not null then update public.partner_ad_payment_orders set financial_payment_id=v_payment,financial_document_id=coalesce(p_document_id,financial_document_id),updated_at=now() where id=v_order.id; end if;
 return v_payment;
end; $$;
revoke all on function public.admin_record_partner_bank_transfer(uuid,numeric,text,text,text,date,text,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.admin_record_partner_bank_transfer(uuid,numeric,text,text,text,date,text,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.admin_confirm_partner_bank_transfer(p_payment_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_payment public.financial_payments%rowtype; v_campaign_total numeric(14,2); v_campaign_price numeric(14,2); v_campaign_status text; v_campaign_account uuid;
 v_document_amount numeric(14,2); v_document_paid numeric(14,2); v_document_status text; v_document_account uuid; v_order public.partner_ad_payment_orders%rowtype;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_payment from public.financial_payments where id=p_payment_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.method<>'BANK_TRANSFER' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if v_payment.status<>'PENDING' then raise exception 'PAYMENT_NOT_PENDING'; end if;
 if v_payment.document_id is not null then
  select amount_mzn,status,partner_account_id into v_document_amount,v_document_status,v_document_account from public.financial_documents where id=v_payment.document_id for update;
  if not found then raise exception 'FINANCIAL_DOCUMENT_NOT_FOUND'; end if;
  if v_document_account is distinct from v_payment.partner_account_id then raise exception 'FINANCIAL_DOCUMENT_PARTNER_MISMATCH'; end if;
  if v_document_status<>'ISSUED' then raise exception 'FINANCIAL_DOCUMENT_NOT_PAYABLE'; end if;
 end if;
 if v_payment.campaign_id is not null then
  select * into v_order from public.partner_ad_payment_orders where campaign_id=v_payment.campaign_id for update;
  if not found or v_order.payment_method<>'BANK_TRANSFER' or v_order.status<>'PENDING' or v_order.financial_payment_id is distinct from p_payment_id or v_order.amount_mzn<>v_payment.amount_mzn then raise exception 'CAMPAIGN_PAYMENT_ORDER_MISMATCH'; end if;
 end if;
 update public.financial_payments set status='CONFIRMED',verified_by=auth.uid(),verified_at=now(),confirmed_at=now(),verification_notes=nullif(trim(p_notes),'') where id=p_payment_id;
 if v_payment.document_id is not null then
  select coalesce(sum(amount_mzn),0) into v_document_paid from public.financial_payments where document_id=v_payment.document_id and status='CONFIRMED';
  if v_document_paid>v_document_amount then raise exception 'FINANCIAL_DOCUMENT_OVERPAID'; end if;
  if v_document_paid=v_document_amount then update public.financial_documents set status='PAID' where id=v_payment.document_id; end if;
 end if;
 if v_payment.campaign_id is not null then
  select price_mzn,status,account_id into v_campaign_price,v_campaign_status,v_campaign_account from public.partner_ad_campaigns where id=v_payment.campaign_id for update;
  if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign_account is distinct from v_payment.partner_account_id then raise exception 'CAMPAIGN_PARTNER_MISMATCH'; end if;
  select coalesce(sum(amount_mzn),0) into v_campaign_total from public.financial_payments where campaign_id=v_payment.campaign_id and status='CONFIRMED';
  if v_campaign_total<>v_order.amount_mzn then raise exception 'CAMPAIGN_PAYMENT_AMOUNT_MISMATCH'; end if;
  update public.partner_ad_payment_orders set status='PAID',confirmed_at=now(),updated_at=now() where id=v_order.id;
  if v_campaign_status='REQUESTED' then update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=v_payment.campaign_id; end if;
 end if;
 return jsonb_build_object('payment_id',p_payment_id,'status','CONFIRMED','campaign_id',v_payment.campaign_id,'campaign_paid_amount',coalesce(v_campaign_total,0),'campaign_price',v_campaign_price,'document_id',v_payment.document_id,'document_paid_amount',coalesce(v_document_paid,0),'document_amount',v_document_amount);
end; $$;
revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;

create or replace function public.admin_cancel_partner_ad_campaign(p_campaign_id uuid,p_reason text,p_external_refund_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor uuid:=auth.uid(); v_campaign public.partner_ad_campaigns%rowtype; v_order public.partner_ad_payment_orders%rowtype;
 v_wallet public.business_credit_wallets%rowtype; v_adjustment uuid; v_reference text:=nullif(trim(coalesce(p_external_refund_reference,'')),'');
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_reason,''))) not between 8 and 1000 then raise exception 'INVALID_CANCELLATION_REASON'; end if;
 select * into v_campaign from public.partner_ad_campaigns where id=p_campaign_id for update;
 if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
 if v_campaign.status not in ('APPROVED','ACTIVE','PAUSED') then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;
 if v_campaign.starts_at is not null and v_campaign.starts_at<=now() then raise exception 'CANCELLATION_NOT_ALLOWED'; end if;
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
 update public.partner_ad_campaigns set status='CANCELLED',updated_at=now() where id=p_campaign_id;
 return jsonb_build_object('adjustment_id',v_adjustment,'refund_type',case when v_order.payment_method='CREDITS' then 'CREDIT_REFUND' when v_order.payment_method='MPESA' then 'MPESA_REFUND' else 'BANK_TRANSFER_REFUND' end,'credits_refunded',v_order.credits_charged,'external_reference',v_reference);
end; $$;
revoke all on function public.admin_cancel_partner_ad_campaign(uuid,text,text) from public,anon;
grant execute on function public.admin_cancel_partner_ad_campaign(uuid,text,text) to authenticated;
