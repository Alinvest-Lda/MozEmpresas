-- F3.27 transversal financial reconciliation for partner campaign and invoice flows.
create or replace function public.admin_financial_reconciliation_f327()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_result jsonb;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 with
 partner_orders as (
 select o.id,o.account_id,o.campaign_id,o.amount_mzn,o.payment_method,o.status,o.financial_payment_id,o.financial_document_id,
 c.price_mzn campaign_price,c.status campaign_status
 from public.partner_ad_payment_orders o left join public.partner_ad_campaigns c on c.id=o.campaign_id
 ),
 partner_issues as (
 select id,case
 when campaign_id is null then 'ORDER_WITHOUT_CAMPAIGN'
 when campaign_price is null then 'CAMPAIGN_PRICE_MISSING'
 when amount_mzn<>campaign_price then 'ORDER_CAMPAIGN_AMOUNT_MISMATCH'
 when status='PAID' and payment_method in ('MPESA','BANK_TRANSFER') and financial_payment_id is null then 'PAID_ORDER_WITHOUT_FINANCIAL_PAYMENT'
 when status='PAID' and financial_document_id is null then 'PAID_ORDER_WITHOUT_DOCUMENT'
 when financial_payment_id is not null and not exists(select 1 from public.financial_payments p where p.id=partner_orders.financial_payment_id and p.partner_account_id=partner_orders.account_id and p.campaign_id=partner_orders.campaign_id and p.amount_mzn=partner_orders.amount_mzn) then 'PAYMENT_LINK_MISMATCH'
 when financial_document_id is not null and not exists(select 1 from public.financial_documents d where d.id=partner_orders.financial_document_id and d.partner_account_id=partner_orders.account_id and d.campaign_id=partner_orders.campaign_id and d.amount_mzn=partner_orders.amount_mzn) then 'DOCUMENT_LINK_MISMATCH'
 when status='PAID' and not exists(select 1 from public.financial_payments p where p.id=partner_orders.financial_payment_id and p.status='CONFIRMED') and payment_method in ('MPESA','BANK_TRANSFER') then 'PAID_ORDER_PAYMENT_UNCONFIRMED'
 when status='REFUNDED' and not exists(select 1 from public.partner_ad_payment_adjustments a where a.order_id=partner_orders.id) then 'REFUNDED_ORDER_WITHOUT_ADJUSTMENT'
 else null end issue_code from partner_orders
 ),
 docs as (
 select d.id,case
 when d.partner_account_id is not null and d.status='PAID' and coalesce((select sum(p.amount_mzn) from public.financial_payments p where p.document_id=d.id and p.status='CONFIRMED'),0)<>d.amount_mzn then 'DOCUMENT_PAID_TOTAL_MISMATCH'
 when d.partner_account_id is not null and d.status='ISSUED' and coalesce((select sum(p.amount_mzn) from public.financial_payments p where p.document_id=d.id and p.status='CONFIRMED'),0)>=d.amount_mzn then 'ISSUED_DOCUMENT_SETTLED_OR_OVERPAID'
 when d.partner_account_id is not null and exists(select 1 from public.financial_payments p where p.document_id=d.id and p.partner_account_id is distinct from d.partner_account_id) then 'DOCUMENT_PAYMENT_PARTNER_MISMATCH'
 else null end issue_code from public.financial_documents d
 ),
 transfers as (
 select p.id,case
 when p.method='BANK_TRANSFER' and p.status='CONFIRMED' and (p.reference is null or p.verified_at is null or p.verified_by is null) then 'CONFIRMED_TRANSFER_MISSING_VERIFICATION'
 when p.method='BANK_TRANSFER' and p.status='CONFIRMED' and p.document_id is null and p.campaign_id is null and p.contract_id is null and p.engagement_id is null then 'CONFIRMED_TRANSFER_UNLINKED'
 when p.method='BANK_TRANSFER' and p.status='CONFIRMED' and p.document_id is not null and not exists(select 1 from public.financial_documents d where d.id=p.document_id and d.partner_account_id=p.partner_account_id) then 'TRANSFER_DOCUMENT_PARTNER_MISMATCH'
 else null end issue_code from public.financial_payments p where p.method='BANK_TRANSFER'
 ),
 wallet as (
 select count(*) mismatch_count from public.business_credit_wallets w where w.balance_credits<>coalesce((select sum(t.credits) from public.credit_transactions t where t.wallet_id=w.id),0)
 )
 select jsonb_build_object(
 'generated_at',now(),
 'partner_ad_orders_checked',(select count(*) from partner_orders),
 'partner_ad_order_issues',(select count(*) from partner_issues where issue_code is not null),
 'partner_ad_issue_codes',(select coalesce(jsonb_object_agg(issue_code,issue_count),'{}'::jsonb) from (select issue_code,count(*) issue_count from partner_issues where issue_code is not null group by issue_code) x),
 'partner_documents_checked',(select count(*) from docs),
 'partner_document_issues',(select count(*) from docs where issue_code is not null),
 'partner_document_issue_codes',(select coalesce(jsonb_object_agg(issue_code,issue_count),'{}'::jsonb) from (select issue_code,count(*) issue_count from docs where issue_code is not null group by issue_code) x),
 'bank_transfers_checked',(select count(*) from transfers),
 'bank_transfer_issues',(select count(*) from transfers where issue_code is not null),
 'bank_transfer_issue_codes',(select coalesce(jsonb_object_agg(issue_code,issue_count),'{}'::jsonb) from (select issue_code,count(*) issue_count from transfers where issue_code is not null group by issue_code) x),
 'wallet_balance_mismatches',(select mismatch_count from wallet)
 ) into v_result;
 return v_result;
end; $$;
revoke all on function public.admin_financial_reconciliation_f327() from public,anon;
grant execute on function public.admin_financial_reconciliation_f327() to authenticated,service_role;
