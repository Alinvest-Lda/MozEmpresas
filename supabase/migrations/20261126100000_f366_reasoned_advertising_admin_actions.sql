-- F3.66: reason-required, row-locked administrative status decisions for business advertising.
create table if not exists public.advertising_admin_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('BUSINESS_PROMOTION','ADVERTISING_REQUEST')),
  entity_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  old_status text not null,
  new_status text not null,
  action_reason text not null check (length(trim(action_reason)) between 8 and 500),
  created_at timestamptz not null default now()
);
create index if not exists advertising_admin_events_entity_created_idx
  on public.advertising_admin_events(entity_type,entity_id,created_at desc);
alter table public.advertising_admin_events enable row level security;
revoke all on public.advertising_admin_events from public,anon,authenticated;
grant select on public.advertising_admin_events to authenticated;
create policy "advertising admin events super admin read"
on public.advertising_admin_events for select to authenticated
using (exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));

create or replace function public.capture_advertising_admin_status_event()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare v_reason text:=nullif(trim(current_setting('app.advertising_admin_reason',true)),'');
begin
  if new.status is distinct from old.status then
    insert into public.advertising_admin_events(entity_type,entity_id,actor_user_id,old_status,new_status,action_reason)
    values(case tg_table_name when 'business_promotions' then 'BUSINESS_PROMOTION' else 'ADVERTISING_REQUEST' end,
      new.id,auth.uid(),old.status::text,new.status::text,coalesce(v_reason,'Alteração operacional legada sem justificação capturada'));
  end if;
  return new;
end;
$function$;
revoke all on function public.capture_advertising_admin_status_event() from public,anon,authenticated;
drop trigger if exists business_promotion_admin_status_event on public.business_promotions;
create trigger business_promotion_admin_status_event after update of status on public.business_promotions
for each row execute function public.capture_advertising_admin_status_event();
drop trigger if exists advertising_request_admin_status_event on public.advertising_requests;
create trigger advertising_request_admin_status_event after update of status on public.advertising_requests
for each row execute function public.capture_advertising_admin_status_event();

create or replace function public.admin_update_advertising_status(
  p_entity_type text,p_entity_id uuid,p_new_status text,p_reason text
) returns void
language plpgsql security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare v_old_status text; v_allowed boolean:=false; v_reason text:=trim(coalesce(p_reason,''));
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_entity_id is null or p_new_status is null or length(v_reason)<8 or length(v_reason)>500 then
    raise exception 'INVALID_ADVERTISING_ADMIN_ACTION';
  end if;
  if p_entity_type='BUSINESS_PROMOTION' then
    select status::text into v_old_status from public.business_promotions where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND'; end if;
    v_allowed:=case v_old_status
      when 'DRAFT' then p_new_status='PENDING'
      when 'PENDING' then p_new_status in ('ACTIVE','PAUSED','EXPIRED')
      when 'ACTIVE' then p_new_status in ('PAUSED','EXPIRED')
      when 'PAUSED' then p_new_status in ('ACTIVE','EXPIRED')
      else false end;
    if p_new_status='ACTIVE' then
      if not exists(select 1 from public.business_promotions bp where bp.id=p_entity_id
        and ((bp.payment_method='CREDITS' and coalesce(bp.credits_charged,0)>0)
          or (bp.payment_method='MPESA' and bp.paid_at is not null))) then
        raise exception 'ADVERTISING_PAYMENT_NOT_SETTLED';
      end if;
    end if;
    if not v_allowed then raise exception 'INVALID_ADVERTISING_STATUS_TRANSITION'; end if;
    perform set_config('app.advertising_admin_reason',v_reason,true);
    update public.business_promotions set status=p_new_status,updated_at=now() where id=p_entity_id;
  elsif p_entity_type='ADVERTISING_REQUEST' then
    select status::text into v_old_status from public.advertising_requests where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND'; end if;
    v_allowed:=case v_old_status
      when 'NEW' then p_new_status in ('CONTACTED','CANCELLED')
      when 'CONTACTED' then p_new_status in ('PROPOSAL','CANCELLED')
      when 'PROPOSAL' then p_new_status in ('AWAITING_PAYMENT','REJECTED','CANCELLED')
      when 'AWAITING_PAYMENT' then p_new_status in ('PAID','REJECTED','CANCELLED')
      when 'PAID' then p_new_status in ('APPROVED','CANCELLED')
      else false end;
    if not v_allowed then raise exception 'INVALID_ADVERTISING_STATUS_TRANSITION'; end if;
    perform set_config('app.advertising_admin_reason',v_reason,true);
    update public.advertising_requests set status=p_new_status,updated_at=now() where id=p_entity_id;
  else
    raise exception 'INVALID_ADVERTISING_ENTITY_TYPE';
  end if;
end;
$function$;
revoke all on function public.admin_update_advertising_status(text,uuid,text,text) from public,anon;
grant execute on function public.admin_update_advertising_status(text,uuid,text,text) to authenticated;
