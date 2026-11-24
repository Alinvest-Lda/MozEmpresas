-- F3.58f: apply operational lifecycle validation to inserts as well as updates.
create or replace function public.guard_partner_operational_lifecycle()
returns trigger language plpgsql set search_path=pg_catalog,public,auth,pg_temp as $$
declare v_reason text; v_account_status text; v_allowed boolean:=false;
begin
 if tg_op='INSERT' then
  if tg_table_name='partner_contracts' then
   if new.status not in ('DRAFT','ACTIVE') then raise exception 'INVALID_INITIAL_CONTRACT_STATE' using errcode='23514'; end if;
   if new.status='ACTIVE' then
    if new.signed_document_path is null then raise exception 'SIGNED_CONTRACT_DOCUMENT_REQUIRED' using errcode='23514'; end if;
    select status into v_account_status from public.partner_accounts where id=new.account_id;
    if v_account_status is distinct from 'ACTIVE' then raise exception 'PARTNER_ACCOUNT_NOT_ACTIVE' using errcode='23514'; end if;
   end if;
  elsif tg_table_name='partner_service_engagements' then
   if new.status<>'RECEIVED' then raise exception 'INVALID_INITIAL_ENGAGEMENT_STATE' using errcode='23514'; end if;
   if new.assigned_commercial_user_id is not null and not exists(select 1 from public.platform_members where user_id=new.assigned_commercial_user_id and active=true) then raise exception 'INVALID_COMMERCIAL_ASSIGNEE' using errcode='23514'; end if;
   if new.assigned_operations_user_id is not null and not exists(select 1 from public.platform_members where user_id=new.assigned_operations_user_id and active=true) then raise exception 'INVALID_OPERATIONS_ASSIGNEE' using errcode='23514'; end if;
   if new.due_at is not null and new.due_at<new.received_at then raise exception 'INVALID_ENGAGEMENT_DUE_DATE' using errcode='22023'; end if;
  elsif tg_table_name='partner_report_deliveries' then
   if new.status<>'DRAFT' then raise exception 'INVALID_INITIAL_REPORT_STATE' using errcode='23514'; end if;
  elsif tg_table_name='partner_entitlements' then
   if new.status not in ('ACTIVE','SUSPENDED') then raise exception 'INVALID_INITIAL_ENTITLEMENT_STATE' using errcode='23514'; end if;
   if new.status='ACTIVE' then
    select status into v_account_status from public.partner_accounts where id=new.account_id;
    if v_account_status is distinct from 'ACTIVE' then raise exception 'PARTNER_ACCOUNT_NOT_ACTIVE' using errcode='23514'; end if;
    if new.ends_at is not null and new.ends_at<=now() then raise exception 'ENTITLEMENT_EXPIRED_BY_DATE' using errcode='23514'; end if;
   end if;
  end if;
  return new;
 end if;
 v_reason:=nullif(trim(current_setting('app.partner_change_reason',true)),'');
 if v_reason is null or length(v_reason)<8 or length(v_reason)>500 then
  raise exception 'PARTNER_OPERATIONAL_CHANGE_REASON_REQUIRED' using errcode='22023';
 end if;
 if tg_table_name='partner_contracts' then
  if old.status in ('COMPLETED','TERMINATED') then raise exception 'CONTRACT_TERMINAL_STATE' using errcode='23514'; end if;
  if old.status in ('ACTIVE','SUSPENDED') and (
   new.contract_code is distinct from old.contract_code or new.title is distinct from old.title or
   new.contract_type is distinct from old.contract_type or new.starts_on is distinct from old.starts_on or
   new.ends_on is distinct from old.ends_on or new.contracted_amount_mzn is distinct from old.contracted_amount_mzn or
   new.currency is distinct from old.currency or new.billing_frequency is distinct from old.billing_frequency or
   new.payment_terms is distinct from old.payment_terms or new.signed_document_path is distinct from old.signed_document_path
  ) then raise exception 'ACTIVE_CONTRACT_TERMS_IMMUTABLE' using errcode='23514'; end if;
  if new.status is distinct from old.status then
   if old.status='DRAFT' then v_allowed:=new.status='ACTIVE';
   elsif old.status='ACTIVE' then v_allowed:=new.status in ('SUSPENDED','COMPLETED','TERMINATED');
   elsif old.status='SUSPENDED' then v_allowed:=new.status in ('ACTIVE','COMPLETED','TERMINATED');
   end if;
   if not v_allowed then raise exception 'INVALID_CONTRACT_TRANSITION' using errcode='23514'; end if;
  end if;
  if new.status='ACTIVE' then
   if new.signed_document_path is null then raise exception 'SIGNED_CONTRACT_DOCUMENT_REQUIRED' using errcode='23514'; end if;
   select status into v_account_status from public.partner_accounts where id=new.account_id;
   if v_account_status is distinct from 'ACTIVE' then raise exception 'PARTNER_ACCOUNT_NOT_ACTIVE' using errcode='23514'; end if;
  end if;
 elsif tg_table_name='partner_service_engagements' then
  if old.status in ('CLOSED','CANCELLED') then raise exception 'ENGAGEMENT_TERMINAL_STATE' using errcode='23514'; end if;
  if new.status is distinct from old.status then
   if old.status='RECEIVED' then v_allowed:=new.status in ('SCOPING','CANCELLED');
   elsif old.status='SCOPING' then v_allowed:=new.status in ('AWAITING_APPROVAL','CANCELLED');
   elsif old.status='AWAITING_APPROVAL' then v_allowed:=new.status in ('APPROVED','ON_HOLD','CANCELLED');
   elsif old.status='APPROVED' then v_allowed:=new.status in ('IN_PROGRESS','ON_HOLD','CANCELLED');
   elsif old.status='IN_PROGRESS' then v_allowed:=new.status in ('UNDER_REVIEW','ON_HOLD','CANCELLED');
   elsif old.status='UNDER_REVIEW' then v_allowed:=new.status in ('IN_PROGRESS','DELIVERED','ON_HOLD');
   elsif old.status='DELIVERED' then v_allowed:=new.status in ('CLOSED','UNDER_REVIEW');
   elsif old.status='ON_HOLD' then v_allowed:=new.status in ('SCOPING','AWAITING_APPROVAL','APPROVED','IN_PROGRESS','UNDER_REVIEW','CANCELLED');
   end if;
   if not v_allowed then raise exception 'INVALID_ENGAGEMENT_TRANSITION' using errcode='23514'; end if;
  end if;
  if new.due_at is not null and new.due_at<new.received_at then raise exception 'INVALID_ENGAGEMENT_DUE_DATE' using errcode='22023'; end if;
  if new.assigned_commercial_user_id is not null and not exists(select 1 from public.platform_members where user_id=new.assigned_commercial_user_id and active=true) then raise exception 'INVALID_COMMERCIAL_ASSIGNEE' using errcode='23514'; end if;
  if new.assigned_operations_user_id is not null and not exists(select 1 from public.platform_members where user_id=new.assigned_operations_user_id and active=true) then raise exception 'INVALID_OPERATIONS_ASSIGNEE' using errcode='23514'; end if;
 elsif tg_table_name='partner_report_deliveries' then
  if old.status in ('DELIVERED','WITHDRAWN') then raise exception 'REPORT_TERMINAL_STATE' using errcode='23514'; end if;
  if new.status is distinct from old.status then
   if old.status='DRAFT' then v_allowed:=new.status in ('READY','WITHDRAWN');
   elsif old.status='READY' then v_allowed:=new.status in ('DELIVERED','FAILED','WITHDRAWN');
   elsif old.status='FAILED' then v_allowed:=new.status in ('READY','WITHDRAWN');
   end if;
   if not v_allowed then raise exception 'INVALID_REPORT_TRANSITION' using errcode='23514'; end if;
  end if;
  if new.status='READY' and new.storage_path is null and new.external_url is null then raise exception 'REPORT_ASSET_REQUIRED' using errcode='23514'; end if;
  if new.status='DELIVERED' and length(trim(coalesce(new.delivery_reference,'')))<3 then raise exception 'DELIVERY_EVIDENCE_REQUIRED' using errcode='22023'; end if;
 elsif tg_table_name='partner_entitlements' then
  if old.status='EXPIRED' then raise exception 'ENTITLEMENT_TERMINAL_STATE' using errcode='23514'; end if;
  if new.status is distinct from old.status then
   if old.status='ACTIVE' then v_allowed:=new.status in ('SUSPENDED','EXPIRED');
   elsif old.status='SUSPENDED' then v_allowed:=new.status in ('ACTIVE','EXPIRED');
   end if;
   if not v_allowed then raise exception 'INVALID_ENTITLEMENT_TRANSITION' using errcode='23514'; end if;
  end if;
  if new.status='ACTIVE' then
   select status into v_account_status from public.partner_accounts where id=new.account_id;
   if v_account_status is distinct from 'ACTIVE' then raise exception 'PARTNER_ACCOUNT_NOT_ACTIVE' using errcode='23514'; end if;
   if new.ends_at is not null and new.ends_at<=now() then raise exception 'ENTITLEMENT_EXPIRED_BY_DATE' using errcode='23514'; end if;
  end if;
 end if;
 return new;
end $$;
drop trigger if exists partner_contract_lifecycle_guard on public.partner_contracts;
create trigger partner_contract_lifecycle_guard before insert or update on public.partner_contracts for each row execute function public.guard_partner_operational_lifecycle();
drop trigger if exists partner_engagement_lifecycle_guard on public.partner_service_engagements;
create trigger partner_engagement_lifecycle_guard before insert or update on public.partner_service_engagements for each row execute function public.guard_partner_operational_lifecycle();
drop trigger if exists partner_report_lifecycle_guard on public.partner_report_deliveries;
create trigger partner_report_lifecycle_guard before insert or update on public.partner_report_deliveries for each row execute function public.guard_partner_operational_lifecycle();
drop trigger if exists partner_entitlement_lifecycle_guard on public.partner_entitlements;
create trigger partner_entitlement_lifecycle_guard before insert or update on public.partner_entitlements for each row execute function public.guard_partner_operational_lifecycle();
