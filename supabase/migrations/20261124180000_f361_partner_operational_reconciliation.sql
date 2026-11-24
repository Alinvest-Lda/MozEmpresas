-- F3.61: read-only reconciliation across institutional contracts, delivery and finance.
create or replace function public.admin_partner_operational_reconciliation_f361()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare
 v_actor uuid:=auth.uid();
 v_result jsonb;
begin
 if v_actor is null or not exists(
   select 1 from public.platform_members pm
   where pm.user_id=v_actor and pm.active=true and pm.role='super_admin'
 ) then
   raise exception 'FORBIDDEN' using errcode='42501';
 end if;

 with issue_rows as (
   select 'CONTRACT_PARTNER_NOT_ACTIVE'::text issue_code,'CONTRACT'::text entity_type,
     c.id record_id,c.account_id,
     jsonb_build_object('contract_code',c.contract_code,'partner_status',a.status) details
   from public.partner_contracts c join public.partner_accounts a on a.id=c.account_id
   where c.status='ACTIVE' and a.status<>'ACTIVE'

   union all
   select 'CONTRACT_ACTIVE_MISSING_APPROVAL','CONTRACT',c.id,c.account_id,
     jsonb_build_object('contract_code',c.contract_code,'approved_by',c.approved_by,'approved_at',c.approved_at)
   from public.partner_contracts c
   where c.status='ACTIVE' and (c.approved_by is null or c.approved_at is null)

   union all
   select 'CONTRACT_ACTIVE_MISSING_SIGNED_DOCUMENT','CONTRACT',c.id,c.account_id,
     jsonb_build_object('contract_code',c.contract_code,'signed_document_path',c.signed_document_path)
   from public.partner_contracts c
   where c.status='ACTIVE'
     and c.signed_document_path is null
     and not exists(select 1 from public.partner_documents d
       where d.account_id=c.account_id and d.document_type='SIGNED_CONTRACT'
         and d.parent_type='CONTRACT' and d.parent_id=c.id)

   union all
   select 'CONTRACT_ACTIVE_EXPIRED','CONTRACT',c.id,c.account_id,
     jsonb_build_object('contract_code',c.contract_code,'ends_on',c.ends_on)
   from public.partner_contracts c
   where c.status='ACTIVE' and c.ends_on is not null and c.ends_on<current_date

   union all
   select 'ENGAGEMENT_CONTRACT_PARTNER_MISMATCH','ENGAGEMENT',e.id,e.account_id,
     jsonb_build_object('engagement_title',e.title,'contract_id',e.contract_id)
   from public.partner_service_engagements e
   join public.partner_contracts c on c.id=e.contract_id
   where c.account_id is distinct from e.account_id

   union all
   select 'ENGAGEMENT_CAMPAIGN_PARTNER_MISMATCH','ENGAGEMENT',e.id,e.account_id,
     jsonb_build_object('engagement_title',e.title,'campaign_id',e.campaign_id)
   from public.partner_service_engagements e
   join public.partner_ad_campaigns c on c.id=e.campaign_id
   where c.account_id is distinct from e.account_id

   union all
   select 'ENGAGEMENT_CLOSED_MISSING_TIMESTAMP','ENGAGEMENT',e.id,e.account_id,
     jsonb_build_object('engagement_title',e.title,'status',e.status)
   from public.partner_service_engagements e
   where e.status='CLOSED' and e.closed_at is null

   union all
   select 'ENGAGEMENT_DELIVERED_MISSING_TIMESTAMP','ENGAGEMENT',e.id,e.account_id,
     jsonb_build_object('engagement_title',e.title,'status',e.status)
   from public.partner_service_engagements e
   where e.status='DELIVERED' and e.delivered_at is null

   union all
   select 'REPORT_PARTNER_CONTRACT_MISMATCH','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'contract_id',r.contract_id)
   from public.partner_report_deliveries r
   join public.partner_contracts c on c.id=r.contract_id
   where c.account_id is distinct from r.account_id

   union all
   select 'REPORT_PARTNER_ENGAGEMENT_MISMATCH','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'engagement_id',r.engagement_id)
   from public.partner_report_deliveries r
   join public.partner_service_engagements e on e.id=r.engagement_id
   where e.account_id is distinct from r.account_id

   union all
   select 'REPORT_PARTNER_CAMPAIGN_MISMATCH','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'campaign_id',r.campaign_id)
   from public.partner_report_deliveries r
   join public.partner_ad_campaigns c on c.id=r.campaign_id
   where c.account_id is distinct from r.account_id

   union all
   select 'REPORT_DELIVERED_MISSING_EVIDENCE','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'channel',r.delivery_channel,'delivered_at',r.delivered_at,
       'delivered_by',r.delivered_by,'delivery_reference',r.delivery_reference)
   from public.partner_report_deliveries r
   where r.status='DELIVERED' and (
     r.delivered_at is null or r.delivered_by is null
     or (r.delivery_channel='EMAIL' and r.delivery_reference is null)
   )

   union all
   select 'REPORT_READY_OR_DELIVERED_MISSING_ASSET','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'status',r.status,'channel',r.delivery_channel)
   from public.partner_report_deliveries r
   where r.status in ('READY','DELIVERED') and r.storage_path is null and r.external_url is null

   union all
   select 'REPORT_EMAIL_WITHOUT_RECIPIENTS','REPORT',r.id,r.account_id,
     jsonb_build_object('title',r.title,'status',r.status)
   from public.partner_report_deliveries r
   where r.delivery_channel='EMAIL' and r.status in ('READY','DELIVERED')
     and coalesce(cardinality(r.recipient_emails),0)=0

   union all
   select 'CAMPAIGN_CONTRACT_PARTNER_MISMATCH','CAMPAIGN',c.id,c.account_id,
     jsonb_build_object('title',c.title,'contract_id',c.contract_id)
   from public.partner_ad_campaigns c
   join public.partner_contracts p on p.id=c.contract_id
   where p.account_id is distinct from c.account_id

   union all
   select 'ENTITLEMENT_PARTNER_NOT_ACTIVE','ENTITLEMENT',e.id,e.account_id,
     jsonb_build_object('name',e.name,'entitlement_status',e.status,'partner_status',p.status)
   from public.partner_entitlements e join public.partner_accounts p on p.id=e.account_id
   where e.status='ACTIVE' and p.status<>'ACTIVE'

   union all
   select 'PAYMENT_CONTRACT_PARTNER_MISMATCH','PAYMENT',p.id,p.partner_account_id,
     jsonb_build_object('contract_id',p.contract_id,'payment_status',p.status)
   from public.financial_payments p
   join public.partner_contracts c on c.id=p.contract_id
   where p.partner_account_id is not null and c.account_id is distinct from p.partner_account_id

   union all
   select 'PAYMENT_ENGAGEMENT_PARTNER_MISMATCH','PAYMENT',p.id,p.partner_account_id,
     jsonb_build_object('engagement_id',p.engagement_id,'payment_status',p.status)
   from public.financial_payments p
   join public.partner_service_engagements e on e.id=p.engagement_id
   where p.partner_account_id is not null and e.account_id is distinct from p.partner_account_id

   union all
   select 'PAYMENT_DOCUMENT_PARTNER_MISMATCH','PAYMENT',p.id,p.partner_account_id,
     jsonb_build_object('document_id',p.document_id,'payment_status',p.status)
   from public.financial_payments p
   join public.financial_documents d on d.id=p.document_id
   where p.partner_account_id is not null and d.partner_account_id is distinct from p.partner_account_id

   union all
   select 'FINANCIAL_DOCUMENT_CONTRACT_PARTNER_MISMATCH','FINANCIAL_DOCUMENT',d.id,d.partner_account_id,
     jsonb_build_object('document_number',d.document_number,'contract_id',d.contract_id)
   from public.financial_documents d
   join public.partner_contracts c on c.id=d.contract_id
   where d.partner_account_id is not null and c.account_id is distinct from d.partner_account_id

   union all
   select 'FINANCIAL_DOCUMENT_ENGAGEMENT_PARTNER_MISMATCH','FINANCIAL_DOCUMENT',d.id,d.partner_account_id,
     jsonb_build_object('document_number',d.document_number,'engagement_id',d.engagement_id)
   from public.financial_documents d
   join public.partner_service_engagements e on e.id=d.engagement_id
   where d.partner_account_id is not null and e.account_id is distinct from d.partner_account_id

   union all
   select 'FINANCIAL_DOCUMENT_CAMPAIGN_PARTNER_MISMATCH','FINANCIAL_DOCUMENT',d.id,d.partner_account_id,
     jsonb_build_object('document_number',d.document_number,'campaign_id',d.campaign_id)
   from public.financial_documents d
   join public.partner_ad_campaigns c on c.id=d.campaign_id
   where d.partner_account_id is not null and c.account_id is distinct from d.partner_account_id
 )
 select jsonb_build_object(
   'generated_at',now(),
   'contracts_checked',(select count(*) from public.partner_contracts),
   'engagements_checked',(select count(*) from public.partner_service_engagements),
   'reports_checked',(select count(*) from public.partner_report_deliveries),
   'campaigns_checked',(select count(*) from public.partner_ad_campaigns),
   'entitlements_checked',(select count(*) from public.partner_entitlements),
   'partner_payments_checked',(select count(*) from public.financial_payments where partner_account_id is not null),
   'partner_financial_documents_checked',(select count(*) from public.financial_documents where partner_account_id is not null),
   'total_issues',(select count(*) from issue_rows),
   'issue_counts',(select coalesce(jsonb_object_agg(issue_code,n),'{}'::jsonb) from (select issue_code,count(*) n from issue_rows group by issue_code) s),
   'issues',(select coalesce(jsonb_agg(jsonb_build_object(
      'issue_code',issue_code,'entity_type',entity_type,'record_id',record_id,
      'account_id',account_id,'details',details
    ) order by issue_code,record_id),'[]'::jsonb)
    from (select * from issue_rows order by issue_code,record_id limit 250) limited)
 ) into v_result;
 return v_result;
end;
$$;

revoke all on function public.admin_partner_operational_reconciliation_f361() from public,anon;
grant execute on function public.admin_partner_operational_reconciliation_f361() to authenticated,service_role;
