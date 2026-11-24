-- F3.64: transparent partner relationship performance signals.
create index if not exists partner_engagement_account_status_due_f364_idx on public.partner_service_engagements(account_id,status,due_at);
create index if not exists partner_report_account_status_f364_idx on public.partner_report_deliveries(account_id,status,created_at desc);
create index if not exists partner_contract_account_status_end_f364_idx on public.partner_contracts(account_id,status,ends_on);
create or replace function public.admin_partner_relationship_performance_f364()
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_result jsonb;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 with m as (
  select a.id account_id,a.name account_name,a.status account_status,a.operating_model,a.portal_enabled,
   coalesce(e.total,0) engagements_total,coalesce(e.completed,0) engagements_completed,coalesce(e.overdue,0) engagements_overdue,
   coalesce(e.unassigned,0) engagements_unassigned,coalesce(e.late,0) engagements_delivered_late,
   coalesce(r.total,0) reports_total,coalesce(r.delivered,0) reports_delivered,coalesce(r.pending,0) reports_pending,coalesce(r.failed,0) reports_failed,
   coalesce(c.expired,0) contracts_expired_active,coalesce(c.expiring30,0) contracts_expiring_30,coalesce(c.expiring90,0) contracts_expiring_90,coalesce(c.active,0) contracts_active,
   coalesce(n.active,0) active_entitlements,coalesce(ad.active,0) active_campaigns
  from public.partner_accounts a
  left join lateral (select count(*) total,count(*) filter(where status in ('DELIVERED','CLOSED')) completed,
   count(*) filter(where status not in ('DELIVERED','CLOSED','CANCELLED') and due_at<now()) overdue,
   count(*) filter(where status not in ('DELIVERED','CLOSED','CANCELLED') and assigned_commercial_user_id is null and assigned_operations_user_id is null) unassigned,
   count(*) filter(where status in ('DELIVERED','CLOSED') and due_at is not null and delivered_at>due_at) late
   from public.partner_service_engagements where account_id=a.id) e on true
  left join lateral (select count(*) total,count(*) filter(where status='DELIVERED') delivered,
   count(*) filter(where status in ('DRAFT','READY')) pending,count(*) filter(where status='FAILED') failed
   from public.partner_report_deliveries where account_id=a.id) r on true
  left join lateral (select count(*) filter(where status='ACTIVE') active,
   count(*) filter(where status='ACTIVE' and ends_on<current_date) expired,
   count(*) filter(where status='ACTIVE' and ends_on between current_date and current_date+30) expiring30,
   count(*) filter(where status='ACTIVE' and ends_on between current_date and current_date+90) expiring90
   from public.partner_contracts where account_id=a.id) c on true
  left join lateral (select count(*) filter(where status='ACTIVE' and (ends_at is null or ends_at>=now())) active from public.partner_entitlements where account_id=a.id) n on true
  left join lateral (select count(*) filter(where status in ('ACTIVE','SCHEDULED') and (ends_at is null or ends_at>=now())) active from public.partner_ad_campaigns where account_id=a.id) ad on true
 ), x as (
  select m.*,case when engagements_total=0 and reports_total=0 and contracts_active=0 and active_entitlements=0 and active_campaigns=0 then 'INSUFFICIENT_DATA'
   when engagements_overdue>0 or contracts_expired_active>0 or reports_failed>0 then 'CRITICAL'
   when reports_pending>0 or contracts_expiring_30>0 or engagements_unassigned>0 then 'FOLLOW_UP' else 'ON_TRACK' end relationship_status,
   jsonb_strip_nulls(jsonb_build_object('overdue_engagements',nullif(engagements_overdue,0),'expired_active_contracts',nullif(contracts_expired_active,0),
    'failed_reports',nullif(reports_failed,0),'pending_reports',nullif(reports_pending,0),'contracts_expiring_30_days',nullif(contracts_expiring_30,0),
    'unassigned_engagements',nullif(engagements_unassigned,0))) risk_signals from m
 )
 select jsonb_build_object('generated_at',now(),'accounts_total',count(*),
  'accounts_critical',count(*) filter(where relationship_status='CRITICAL'),'accounts_follow_up',count(*) filter(where relationship_status='FOLLOW_UP'),
  'accounts_on_track',count(*) filter(where relationship_status='ON_TRACK'),'accounts_insufficient_data',count(*) filter(where relationship_status='INSUFFICIENT_DATA'),
  'accounts',coalesce(jsonb_agg(jsonb_build_object('account_id',account_id,'account_name',account_name,'account_status',account_status,
   'operating_model',operating_model,'portal_enabled',portal_enabled,'relationship_status',relationship_status,'risk_signals',risk_signals,
   'engagements_total',engagements_total,'engagements_completed',engagements_completed,'engagements_overdue',engagements_overdue,
   'engagements_unassigned',engagements_unassigned,'engagements_delivered_late',engagements_delivered_late,
   'engagement_completion_rate',case when engagements_total>0 then round(100.0*engagements_completed/engagements_total,1) end,
   'reports_total',reports_total,'reports_delivered',reports_delivered,'reports_pending',reports_pending,'reports_failed',reports_failed,
   'report_delivery_rate',case when reports_total>0 then round(100.0*reports_delivered/reports_total,1) end,
   'contracts_active',contracts_active,'contracts_expired_active',contracts_expired_active,'contracts_expiring_30',contracts_expiring_30,
   'contracts_expiring_90',contracts_expiring_90,'active_entitlements',active_entitlements,'active_campaigns',active_campaigns)
   order by case relationship_status when 'CRITICAL' then 1 when 'FOLLOW_UP' then 2 when 'INSUFFICIENT_DATA' then 3 else 4 end,account_name),'[]'::jsonb)
 ) into v_result from x;
 return v_result;
end; $$;
revoke all on function public.admin_partner_relationship_performance_f364() from public,anon;
grant execute on function public.admin_partner_relationship_performance_f364() to authenticated;