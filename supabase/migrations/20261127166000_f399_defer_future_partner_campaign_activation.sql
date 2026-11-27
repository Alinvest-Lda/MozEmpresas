-- F3.99: credit settlement must not activate a partner campaign before its contracted start.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_definition;

  v_old:=$old$
    update public.partner_ad_campaigns set status='ACTIVE',updated_at=now() where id=p_campaign_id;
$old$;
  v_new:=$new$
    if v_campaign.starts_at is not null and v_campaign.starts_at<=now()
      and v_campaign.ends_at is not null and v_campaign.ends_at>now() then
      update public.partner_ad_campaigns set status='ACTIVE',updated_at=now() where id=p_campaign_id;
    else
      update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=p_campaign_id;
    end if;
$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F399_CREDIT_ACTIVATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('v_campaign.starts_at<=now()' in v_definition)=0
    or position('set status=''APPROVED''' in v_definition)=0 then
    raise exception 'F399_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_issue_partner_ad_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
