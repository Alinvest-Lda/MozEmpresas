-- F4.00: M-Pesa callbacks must respect the same contracted activation window as credit settlement.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)'::regprocedure)
    into v_definition;

  v_old:=$old$
  update public.partner_ad_campaigns set status='ACTIVE',updated_at=now() where id=v_order.campaign_id and status='APPROVED';
$old$;
  v_new:=$new$
  update public.partner_ad_campaigns
  set status=case
    when starts_at is not null and starts_at<=now() and ends_at is not null and ends_at>now() then 'ACTIVE'
    else 'APPROVED'
  end,updated_at=now()
  where id=v_order.campaign_id and status='APPROVED';
$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F400_MPESA_ACTIVATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('starts_at<=now()' in v_definition)=0
    or position('set search_path=pg_catalog,public,pg_temp' in v_definition)=0 then
    v_definition:=replace(v_definition,'set search_path=public,pg_temp','set search_path=pg_catalog,public,pg_temp');
  end if;
  if position('starts_at<=now()' in v_definition)=0 then
    raise exception 'F400_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text) to service_role;
