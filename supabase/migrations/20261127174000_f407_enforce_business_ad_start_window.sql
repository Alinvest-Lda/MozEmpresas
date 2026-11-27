-- F4.07: business advertising activation must respect the contracted start and end timestamps.
do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric)'::regprocedure)
    into v_definition;

  v_old:=$old$if p_new_status='ACTIVE' and not exists(
      select 1 from public.business_promotions bp where bp.id=p_entity_id
        and bp.starts_at is not null and bp.ends_at is not null and bp.ends_at>now()
    ) then raise exception 'ADVERTISING_CAMPAIGN_WINDOW_CLOSED' using errcode='23514'; end if;$old$;

  v_new:=$new$if p_new_status='ACTIVE' and exists(
      select 1 from public.business_promotions bp where bp.id=p_entity_id and bp.starts_at>now()
    ) then raise exception 'CAMPAIGN_START_DATE_NOT_REACHED' using errcode='23514'; end if;
    if p_new_status='ACTIVE' and not exists(
      select 1 from public.business_promotions bp where bp.id=p_entity_id
        and bp.starts_at is not null and bp.starts_at<=now() and bp.ends_at is not null and bp.ends_at>now()
    ) then raise exception 'ADVERTISING_CAMPAIGN_WINDOW_CLOSED' using errcode='23514'; end if;$new$;

  if position(v_old in v_definition)=0 then
    raise exception 'F407_BUSINESS_ACTIVATION_WINDOW_GUARD_NOT_FOUND';
  end if;
  v_definition:=replace(v_definition,v_old,v_new);
  if position('CAMPAIGN_START_DATE_NOT_REACHED' in v_definition)=0
    or position('bp.starts_at<=now()' in v_definition)=0 then
    raise exception 'F407_REWRITE_INCOMPLETE';
  end if;
  execute v_definition;
end
$migration$;

revoke all on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_update_advertising_status(text,uuid,text,text,text,text,numeric) to authenticated;
