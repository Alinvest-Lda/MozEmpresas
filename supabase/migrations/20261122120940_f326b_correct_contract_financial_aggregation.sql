
create or replace view public.partner_contract_financial_summary with (security_invoker=true) as
select c.id contract_id,c.account_id,c.contract_code,c.title,c.contract_type,c.status,c.contracted_amount_mzn,
 coalesce(d.invoiced_amount_mzn,0)::numeric(14,2) invoiced_amount_mzn,
 coalesce(p.received_amount_mzn,0)::numeric(14,2) received_amount_mzn,
 (coalesce(d.invoiced_amount_mzn,0)-coalesce(p.received_amount_mzn,0))::numeric(14,2) outstanding_amount_mzn
from public.partner_contracts c
left join (select contract_id,sum(amount_mzn)::numeric(14,2) invoiced_amount_mzn from public.financial_documents where contract_id is not null and status<>'VOID' group by contract_id) d on d.contract_id=c.id
left join (select contract_id,sum(amount_mzn)::numeric(14,2) received_amount_mzn from public.financial_payments where contract_id is not null and status='CONFIRMED' group by contract_id) p on p.contract_id=c.id;
