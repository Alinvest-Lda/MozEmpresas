-- F4.05: start the 24h advertising-request transfer window when payment is requested, not when the lead was first submitted.
alter table public.advertising_requests
  add column if not exists bank_transfer_expires_at timestamptz;

update public.advertising_requests
set bank_transfer_expires_at=now()+interval '24 hours'
where status='AWAITING_PAYMENT' and bank_transfer_expires_at is null;

create index if not exists advertising_requests_bank_transfer_expiry_idx
  on public.advertising_requests(bank_transfer_expires_at)
  where status='AWAITING_PAYMENT' and bank_transfer_expires_at is not null;

do $migration$
declare
  v_definition text;
  v_old_guard text;
  v_new_guard text;
  v_old_transition text;
  v_new_transition text;
  v_old_update text;
  v_new_update text;
begin
  select pg_get_functiondef('public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric)'::regprocedure)
    into v_definition;

  v_old_guard:=$old$if p_payment_method='BANK_TRANSFER' and exists(select 1 from public.advertising_requests ar where ar.id=p_entity_id and ar.created_at+interval '24 hours'<=now()) then raise exception 'BANK_TRANSFER_CONFIRMATION_EXPIRED' using errcode='23514'; end if;$old$;
  v_new_guard:=$new$if p_payment_method='BANK_TRANSFER' and exists(select 1 from public.advertising_requests ar where ar.id=p_entity_id and (ar.bank_transfer_expires_at is null or ar.bank_transfer_expires_at<=now())) then raise exception 'BANK_TRANSFER_CONFIRMATION_EXPIRED' using errcode='23514'; end if;$new$;

  v_old_transition:=$old$when 'AWAITING_PAYMENT' then p_new_status in ('PAID','REJECTED','CANCELLED')$old$;
  v_new_transition:=$new$when 'AWAITING_PAYMENT' then p_new_status in ('AWAITING_PAYMENT','PAID','REJECTED','CANCELLED')$new$;

  v_old_update:=$old$update public.advertising_requests set status=p_new_status,updated_at=now() where id=p_entity_id;$old$;
  v_new_update:=$new$update public.advertising_requests
      set status=p_new_status,
          bank_transfer_expires_at=case when p_new_status='AWAITING_PAYMENT' then now()+interval '24 hours' else bank_transfer_expires_at end,
          updated_at=now()
      where id=p_entity_id;$new$;

  if position(v_old_guard in v_definition)=0 then raise exception 'F405_BANK_TRANSFER_GUARD_NOT_FOUND'; end if;
  if position(v_old_transition in v_definition)=0 then raise exception 'F405_PAYMENT_RENEWAL_TRANSITION_NOT_FOUND'; end if;
  if position(v_old_update in v_definition)=0 then raise exception 'F405_PAYMENT_REQUEST_UPDATE_NOT_FOUND'; end if;

  v_definition:=replace(v_definition,v_old_guard,v_new_guard);
  v_definition:=replace(v_definition,v_old_transition,v_new_transition);
  v_definition:=replace(v_definition,v_old_update,v_new_update);

  if position('bank_transfer_expires_at<=now()' in v_definition)=0
    or position('bank_transfer_expires_at=case when p_new_status' in v_definition)=0 then
    raise exception 'F405_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) to authenticated;
