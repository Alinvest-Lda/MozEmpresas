-- F3.73: a public advertising request cannot be marked PAID without settlement evidence.
alter table public.advertising_requests
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists paid_amount_mzn numeric(14,2),
  add column if not exists paid_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

alter table public.advertising_requests
  drop constraint if exists advertising_requests_payment_method_check;
alter table public.advertising_requests
  add constraint advertising_requests_payment_method_check
  check (payment_method is null or payment_method in ('MPESA','BANK_TRANSFER','CASH','OTHER'));
alter table public.advertising_requests
  drop constraint if exists advertising_requests_paid_amount_check;
alter table public.advertising_requests
  add constraint advertising_requests_paid_amount_check
  check (paid_amount_mzn is null or paid_amount_mzn > 0);

create index if not exists advertising_requests_paid_at_idx
  on public.advertising_requests(paid_at desc) where status='PAID';

create or replace function public.admin_update_advertising_status(
  p_entity_type text,
  p_entity_id uuid,
  p_new_status text,
  p_reason text,
  p_payment_method text default null,
  p_payment_reference text default null,
  p_paid_amount_mzn numeric default null
) returns void
language plpgsql
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
declare
  v_old_status text;
  v_allowed boolean:=false;
  v_reason text:=trim(coalesce(p_reason,''));
  v_reference text:=nullif(trim(coalesce(p_payment_reference,'')),'');
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if p_entity_id is null or p_new_status is null or length(v_reason)<8 or length(v_reason)>500 then
    raise exception 'INVALID_ADVERTISING_ADMIN_ACTION' using errcode='22023';
  end if;

  if p_entity_type='BUSINESS_PROMOTION' then
    if p_payment_method is not null or v_reference is not null or p_paid_amount_mzn is not null then
      raise exception 'UNEXPECTED_SETTLEMENT_EVIDENCE' using errcode='22023';
    end if;
    select status::text into v_old_status from public.business_promotions where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND' using errcode='P0002'; end if;
    v_allowed:=case v_old_status
      when 'DRAFT' then p_new_status='PENDING'
      when 'PENDING' then p_new_status in ('ACTIVE','PAUSED','EXPIRED')
      when 'ACTIVE' then p_new_status in ('PAUSED','EXPIRED')
      when 'PAUSED' then p_new_status in ('ACTIVE','EXPIRED')
      else false end;
    if p_new_status='ACTIVE' and not exists(
      select 1 from public.business_promotions bp where bp.id=p_entity_id
      and ((bp.payment_method='CREDITS' and coalesce(bp.credits_charged,0)>0)
        or (bp.payment_method='MPESA' and bp.paid_at is not null))
    ) then raise exception 'ADVERTISING_PAYMENT_NOT_SETTLED' using errcode='23514'; end if;
    if not v_allowed then raise exception 'INVALID_ADVERTISING_STATUS_TRANSITION' using errcode='23514'; end if;
    perform set_config('app.advertising_admin_reason',v_reason,true);
    update public.business_promotions set status=p_new_status,updated_at=now() where id=p_entity_id;

  elsif p_entity_type='ADVERTISING_REQUEST' then
    select status into v_old_status from public.advertising_requests where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND' using errcode='P0002'; end if;
    v_allowed:=case v_old_status
      when 'NEW' then p_new_status in ('CONTACTED','CANCELLED')
      when 'CONTACTED' then p_new_status in ('PROPOSAL','CANCELLED')
      when 'PROPOSAL' then p_new_status in ('AWAITING_PAYMENT','REJECTED','CANCELLED')
      when 'AWAITING_PAYMENT' then p_new_status in ('PAID','REJECTED','CANCELLED')
      when 'PAID' then p_new_status='APPROVED'
      else false end;
    if not v_allowed then raise exception 'INVALID_ADVERTISING_STATUS_TRANSITION' using errcode='23514'; end if;

    perform set_config('app.advertising_admin_reason',v_reason,true);
    if p_new_status='PAID' then
      if p_payment_method not in ('MPESA','BANK_TRANSFER','CASH','OTHER')
        or v_reference is null or length(v_reference)<4 or length(v_reference)>160
        or p_paid_amount_mzn is null or p_paid_amount_mzn<=0 then
        raise exception 'ADVERTISING_REQUEST_SETTLEMENT_EVIDENCE_REQUIRED' using errcode='22023';
      end if;
      update public.advertising_requests
      set status='PAID',payment_method=p_payment_method,payment_reference=v_reference,
          paid_amount_mzn=p_paid_amount_mzn,paid_at=now(),verified_by=auth.uid(),updated_at=now()
      where id=p_entity_id;
    else
      if p_payment_method is not null or v_reference is not null or p_paid_amount_mzn is not null then
        raise exception 'UNEXPECTED_SETTLEMENT_EVIDENCE' using errcode='22023';
      end if;
      update public.advertising_requests set status=p_new_status,updated_at=now() where id=p_entity_id;
    end if;
  else
    raise exception 'INVALID_ADVERTISING_ENTITY_TYPE' using errcode='22023';
  end if;
end;
$function$;

revoke all on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) from public,anon;
grant execute on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) to authenticated;
