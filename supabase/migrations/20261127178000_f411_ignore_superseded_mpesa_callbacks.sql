-- F4.11: delayed callbacks for a superseded M-Pesa attempt must be ignored, not treated as a missing order.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure)
    into v_definition;
  v_old:=$old$  if not found then raise exception 'PARTNER_AD_PAYMENT_NOT_FOUND'; end if;
  select * into v_order from public.partner_ad_payment_orders where financial_payment_id=v_payment.id for update;$old$;
  v_new:=$new$  if not found then raise exception 'PARTNER_AD_PAYMENT_NOT_FOUND'; end if;
  if v_payment.status='FAILED' then
    return jsonb_build_object('ignored',true,'reason','SUPERSEDED_OR_FAILED');
  end if;
  select * into v_order from public.partner_ad_payment_orders where financial_payment_id=v_payment.id for update;$new$;
  if position(v_old in v_definition)=0 then
    raise exception 'F411_MPESA_CONFIRM_CALLBACK_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.fail_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure)
    into v_definition;
  if position(v_old in v_definition)=0 then
    raise exception 'F411_MPESA_FAILURE_CALLBACK_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end
$migration$;

revoke all on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
revoke all on function public.fail_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.fail_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
