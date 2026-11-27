-- F4.09: legacy catalogue rows with invalid surface/slot pairs cannot be charged or activated.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_issue_partner_ad_payment(uuid,text,numeric)'::regprocedure)
    into v_definition;
  v_old:=$old$if not found then raise exception 'AD_PRODUCT_NOT_AVAILABLE'; end if;$old$;
  v_new:=$new$if not found then raise exception 'AD_PRODUCT_NOT_AVAILABLE'; end if;
  if v_product.surface is null or v_product.slot is null or not (
    (v_product.surface='HOME' and v_product.slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
    (v_product.surface='DIRECTORY' and v_product.slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
    (v_product.surface='MARKETPLACE' and v_product.slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
    (v_product.surface='OPPORTUNITIES' and v_product.slot in ('BILLBOARD','FEATURED','INFEED'))
  )) then raise exception 'AD_PRODUCT_NOT_DELIVERABLE'; end if;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F409_PARTNER_PAYMENT_PRODUCT_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.admin_transition_partner_ad_campaign(uuid,text,text)'::regprocedure)
    into v_definition;
  v_old:=$old$if not found then raise exception 'CAMPAIGN_NOT_FOUND' using errcode='P0002'; end if;$old$;
  v_new:=$new$if not found then raise exception 'CAMPAIGN_NOT_FOUND' using errcode='P0002'; end if;
  if p_new_status='ACTIVE' and (v_campaign.surface is null or v_campaign.slot is null or not (
    (v_campaign.surface='HOME' and v_campaign.slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
    (v_campaign.surface='DIRECTORY' and v_campaign.slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
    (v_campaign.surface='MARKETPLACE' and v_campaign.slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
    (v_campaign.surface='OPPORTUNITIES' and v_campaign.slot in ('BILLBOARD','FEATURED','INFEED'))
  )) then raise exception 'AD_PRODUCT_NOT_DELIVERABLE'; end if;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F409_PARTNER_ACTIVATION_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;

  select pg_get_functiondef('public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric)'::regprocedure)
    into v_definition;
  v_old:=$old$select status::text into v_old_status from public.business_promotions where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND' using errcode='P0002'; end if;$old$;
  v_new:=$new$select status::text into v_old_status from public.business_promotions where id=p_entity_id for update;
    if not found then raise exception 'ADVERTISING_ENTITY_NOT_FOUND' using errcode='P0002'; end if;
    if p_new_status='ACTIVE' and not exists(
      select 1 from public.business_promotions bp where bp.id=p_entity_id and (
        (bp.placement='HOME' and bp.slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
        (bp.placement='DIRECTORY' and bp.slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
        (bp.placement='MARKETPLACE' and bp.slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
        (bp.placement='OPPORTUNITIES' and bp.slot in ('BILLBOARD','FEATURED','INFEED'))
      )
    ) then raise exception 'AD_PRODUCT_NOT_DELIVERABLE'; end if;$new$;
  if position(v_old in v_definition)=0 then raise exception 'F409_BUSINESS_ACTIVATION_GUARD_NOT_FOUND'; end if;
  v_definition:=replace(v_definition,v_old,v_new);
  execute v_definition;
end
$migration$;

revoke all on function public.admin_issue_partner_ad_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
revoke all on function public.admin_transition_partner_ad_campaign(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_transition_partner_ad_campaign(uuid,text,text) to authenticated;
revoke all on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) to authenticated;
