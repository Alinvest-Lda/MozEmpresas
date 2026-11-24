-- F3.62/F3.63: execution accountability dashboard and contract renewal pipeline.
alter table public.partner_contracts
  add column if not exists renewal_status text not null default 'NOT_REVIEWED',
  add column if not exists renewal_owner_user_id uuid references auth.users(id),
  add column if not exists renewal_due_on date,
  add column if not exists renewal_notes text;

alter table public.partner_contracts drop constraint if exists partner_contracts_renewal_status_check;
alter table public.partner_contracts add constraint partner_contracts_renewal_status_check
  check (renewal_status in ('NOT_REVIEWED','REVIEW_REQUIRED','IN_PROGRESS','RENEWED','NON_RENEWAL'));
alter table public.partner_contracts drop constraint if exists partner_contracts_renewal_notes_check;
alter table public.partner_contracts add constraint partner_contracts_renewal_notes_check
  check (renewal_notes is null or length(trim(renewal_notes)) between 8 and 1000);
create index if not exists partner_contracts_renewal_queue_idx
  on public.partner_contracts(renewal_status,ends_on,renewal_due_on)
  where status='ACTIVE';
create index if not exists partner_engagement_due_queue_idx
  on public.partner_service_engagements(due_at,status)
  where status not in ('DELIVERED','CLOSED','CANCELLED');
create index if not exists partner_reports_pending_queue_idx
  on public.partner_report_deliveries(status,created_at)
  where status in ('DRAFT','READY','FAILED');

create or replace function public.admin_update_partner_contract_renewal_f363(
  p_contract_id uuid,
  p_renewal_status text,
  p_renewal_due_on date,
  p_renewal_owner_user_id uuid,
  p_renewal_notes text
) returns void
language plpgsql
security invoker
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare
  v_before public.partner_contracts%rowtype;
  v_after public.partner_contracts%rowtype;
  v_actor uuid:=auth.uid();
begin
  if v_actor is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_renewal_status not in ('NOT_REVIEWED','REVIEW_REQUIRED','IN_PROGRESS','RENEWED','NON_RENEWAL') then
    raise exception 'INVALID_RENEWAL_STATUS' using errcode='22023';
  end if;
  if p_renewal_notes is null or length(trim(p_renewal_notes)) not between 8 and 1000 then
    raise exception 'RENEWAL_REASON_REQUIRED' using errcode='22023';
  end if;
  if p_renewal_status='IN_PROGRESS' and (p_renewal_due_on is null or p_renewal_due_on<current_date) then
    raise exception 'RENEWAL_DUE_DATE_REQUIRED' using errcode='22023';
  end if;
  if p_renewal_owner_user_id is not null and not exists(
    select 1 from public.platform_members pm where pm.user_id=p_renewal_owner_user_id and pm.active=true
  ) then
    raise exception 'RENEWAL_OWNER_NOT_ACTIVE' using errcode='22023';
  end if;

  select * into v_before from public.partner_contracts where id=p_contract_id for update;
  if not found then raise exception 'CONTRACT_NOT_FOUND' using errcode='P0002'; end if;
  if v_before.status not in ('ACTIVE','SUSPENDED') then
    raise exception 'CONTRACT_NOT_RENEWABLE' using errcode='22023';
  end if;

  update public.partner_contracts
  set renewal_status=p_renewal_status,
      renewal_due_on=p_renewal_due_on,
      renewal_owner_user_id=p_renewal_owner_user_id,
      renewal_notes=trim(p_renewal_notes),
      updated_at=now()
  where id=p_contract_id
  returning * into v_after;

  insert into public.partner_operational_audit(
    account_id,entity_type,entity_id,action,actor_user_id,before_state,after_state,reason
  ) values (
    v_after.account_id,'CONTRACT',v_after.id,'CONTRACT_RENEWAL_UPDATED',v_actor,
    jsonb_build_object('renewal_status',v_before.renewal_status,'renewal_due_on',v_before.renewal_due_on,
      'renewal_owner_user_id',v_before.renewal_owner_user_id,'renewal_notes',v_before.renewal_notes),
    jsonb_build_object('renewal_status',v_after.renewal_status,'renewal_due_on',v_after.renewal_due_on,
      'renewal_owner_user_id',v_after.renewal_owner_user_id,'renewal_notes',v_after.renewal_notes),
    trim(p_renewal_notes)
  );
end;
$$;
revoke all on function public.admin_update_partner_contract_renewal_f363(uuid,text,date,uuid,text) from public,anon;
grant execute on function public.admin_update_partner_contract_renewal_f363(uuid,text,date,uuid,text) to authenticated;

create or replace function public.admin_partner_execution_renewal_dashboard_f362()
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,public,auth,pg_temp
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;

  select jsonb_build_object(
    'generated_at',now(),
    'engagements_open',(select count(*) from public.partner_service_engagements e where e.status not in ('DELIVERED','CLOSED','CANCELLED')),
    'engagements_overdue',(select count(*) from public.partner_service_engagements e where e.status not in ('DELIVERED','CLOSED','CANCELLED') and e.due_at<now()),
    'engagements_due_7_days',(select count(*) from public.partner_service_engagements e where e.status not in ('DELIVERED','CLOSED','CANCELLED') and e.due_at>=now() and e.due_at<now()+interval '7 days'),
    'engagements_unassigned',(select count(*) from public.partner_service_engagements e where e.status not in ('DELIVERED','CLOSED','CANCELLED') and e.assigned_commercial_user_id is null and e.assigned_operations_user_id is null),
    'reports_pending',(select count(*) from public.partner_report_deliveries r where r.status in ('DRAFT','READY','FAILED')),
    'contracts_expired_active',(select count(*) from public.partner_contracts c where c.status='ACTIVE' and c.ends_on<current_date),
    'contracts_expiring_30_days',(select count(*) from public.partner_contracts c where c.status='ACTIVE' and c.ends_on between current_date and current_date+30),
    'contracts_expiring_90_days',(select count(*) from public.partner_contracts c where c.status='ACTIVE' and c.ends_on between current_date and current_date+90),
    'renewals_in_progress',(select count(*) from public.partner_contracts c where c.status in ('ACTIVE','SUSPENDED') and c.renewal_status='IN_PROGRESS'),
    'engagements',(select coalesce(jsonb_agg(x.item order by x.sort_at asc),'[]'::jsonb) from (
      select jsonb_build_object(
        'id',e.id,'account_id',e.account_id,'account_name',a.name,'title',e.title,'service_type',e.service_type,
        'status',e.status,'received_at',e.received_at,'due_at',e.due_at,
        'assigned_commercial_user_id',e.assigned_commercial_user_id,
        'assigned_operations_user_id',e.assigned_operations_user_id,
        'days_open',greatest(0,(current_date-e.received_at::date)),
        'days_overdue',case when e.due_at<now() then greatest(0,current_date-e.due_at::date) else 0 end
      ) item,coalesce(e.due_at,'infinity'::timestamptz) sort_at
      from public.partner_service_engagements e join public.partner_accounts a on a.id=e.account_id
      where e.status not in ('DELIVERED','CLOSED','CANCELLED')
      order by coalesce(e.due_at,'infinity'::timestamptz),e.received_at limit 150
    ) x),
    'reports',(select coalesce(jsonb_agg(x.item order by x.created_at asc),'[]'::jsonb) from (
      select jsonb_build_object('id',r.id,'account_id',r.account_id,'account_name',a.name,'title',r.title,
        'status',r.status,'delivery_channel',r.delivery_channel,'recipient_count',cardinality(r.recipient_emails),
        'created_at',r.created_at,'period_end',r.period_end) item,r.created_at
      from public.partner_report_deliveries r join public.partner_accounts a on a.id=r.account_id
      where r.status in ('DRAFT','READY','FAILED')
      order by r.created_at limit 100
    ) x),
    'renewals',(select coalesce(jsonb_agg(x.item order by x.ends_on asc nulls last),'[]'::jsonb) from (
      select jsonb_build_object('id',c.id,'account_id',c.account_id,'account_name',a.name,
        'contract_code',c.contract_code,'title',c.title,'status',c.status,'ends_on',c.ends_on,
        'renewal_status',c.renewal_status,'renewal_due_on',c.renewal_due_on,
        'renewal_owner_user_id',c.renewal_owner_user_id,'renewal_notes',c.renewal_notes,
        'days_to_expiry',case when c.ends_on is null then null else c.ends_on-current_date end
      ) item,c.ends_on
      from public.partner_contracts c join public.partner_accounts a on a.id=c.account_id
      where c.status in ('ACTIVE','SUSPENDED')
        and (c.ends_on<=current_date+90 or c.renewal_status<>'NOT_REVIEWED')
      order by c.ends_on nulls last limit 150
    ) x)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.admin_partner_execution_renewal_dashboard_f362() from public,anon;
grant execute on function public.admin_partner_execution_renewal_dashboard_f362() to authenticated;
