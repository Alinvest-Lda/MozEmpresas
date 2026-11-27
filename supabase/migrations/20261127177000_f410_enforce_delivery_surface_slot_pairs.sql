-- F4.10: the decision engine and event writer accept only real public placement pairs.
do $migration$
declare
  v_definition text;
  v_old_business text;
  v_new_business text;
  v_old_partner text;
  v_new_partner text;
begin
  select pg_get_functiondef('public.get_ad_decision(text,uuid,text,text,jsonb)'::regprocedure)
    into v_definition;

  v_old_business:=$old$where bp.status='ACTIVE' and bp.placement=p_surface and bp.slot=p_slot and bp.starts_at<=now() and bp.ends_at>now()$old$;
  v_new_business:=$new$where bp.status='ACTIVE' and bp.placement=p_surface and bp.slot=p_slot
   and ((p_surface='HOME' and p_slot in ('HERO','BILLBOARD','EXCLUSIVE'))
     or (p_surface='DIRECTORY' and p_slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT'))
     or (p_surface='MARKETPLACE' and p_slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED'))
     or (p_surface='OPPORTUNITIES' and p_slot in ('BILLBOARD','FEATURED','INFEED')))
   and bp.starts_at<=now() and bp.ends_at>now()$new$;
  v_old_partner:=$old$where pc.status='ACTIVE' and pc.surface=p_surface and pc.slot=p_slot and pc.starts_at<=now() and pc.ends_at>now()$old$;
  v_new_partner:=$new$where pc.status='ACTIVE' and pc.surface=p_surface and pc.slot=p_slot
   and ((p_surface='HOME' and p_slot in ('HERO','BILLBOARD','EXCLUSIVE'))
     or (p_surface='DIRECTORY' and p_slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT'))
     or (p_surface='MARKETPLACE' and p_slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED'))
     or (p_surface='OPPORTUNITIES' and p_slot in ('BILLBOARD','FEATURED','INFEED')))
   and pc.starts_at<=now() and pc.ends_at>now()$new$;

  if position(v_old_business in v_definition)=0 or position(v_old_partner in v_definition)=0 then
    raise exception 'F410_DECISION_INVENTORY_FILTER_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old_business,v_new_business);
  v_definition:=replace(v_definition,v_old_partner,v_new_partner);
  execute v_definition;
end
$migration$;

do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.record_ad_delivery_event_f370(text,uuid,text,uuid,text,text,text,jsonb)'::regprocedure)
    into v_definition;
  v_old:=$old$or p_event_type not in ('IMPRESSION','CLICK')
    or coalesce(jsonb_typeof(p_context),'null') <> 'object' then$old$;
  v_new:=$new$or p_event_type not in ('IMPRESSION','CLICK')
    or not (
      (p_surface='HOME' and p_slot in ('HERO','BILLBOARD','EXCLUSIVE')) or
      (p_surface='DIRECTORY' and p_slot in ('BILLBOARD','FEATURED','INFEED','CONTEXT')) or
      (p_surface='MARKETPLACE' and p_slot in ('BILLBOARD','FEATURED','EXCLUSIVE','INFEED')) or
      (p_surface='OPPORTUNITIES' and p_slot in ('BILLBOARD','FEATURED','INFEED'))
    )
    or coalesce(jsonb_typeof(p_context),'null') <> 'object' then$new$;
  if position(v_old in v_definition)=0 then
    raise exception 'F410_EVENT_PAIR_VALIDATION_ANCHOR_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('p_surface=''HOME'' and p_slot in' in v_definition)=0 then
    raise exception 'F410_EVENT_PAIR_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.get_ad_decision(text,uuid,text,text,jsonb) from public;
grant execute on function public.get_ad_decision(text,uuid,text,text,jsonb) to anon,authenticated;
revoke all on function public.record_ad_delivery_event_f370(text,uuid,text,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_ad_delivery_event_f370(text,uuid,text,uuid,text,text,text,jsonb) to service_role;
