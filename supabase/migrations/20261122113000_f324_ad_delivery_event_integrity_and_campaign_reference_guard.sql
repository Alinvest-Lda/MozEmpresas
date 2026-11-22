-- F3.24: enforce integrity of ad delivery telemetry and campaign references.
alter table public.ad_delivery_events
  add constraint ad_delivery_events_source_check
    check (campaign_source in ('business','partner')) not valid,
  add constraint ad_delivery_events_type_check
    check (event_type in ('IMPRESSION','CLICK')) not valid,
  add constraint ad_delivery_events_visitor_key_check
    check (length(visitor_key) between 16 and 200) not valid,
  add constraint ad_delivery_events_context_object_check
    check (jsonb_typeof(context) = 'object') not valid;

alter table public.ad_delivery_events
  validate constraint ad_delivery_events_source_check;
alter table public.ad_delivery_events
  validate constraint ad_delivery_events_type_check;
alter table public.ad_delivery_events
  validate constraint ad_delivery_events_visitor_key_check;
alter table public.ad_delivery_events
  validate constraint ad_delivery_events_context_object_check;

create or replace function public.validate_ad_delivery_campaign_reference()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_surface text;
  v_slot text;
begin
  if new.campaign_source = 'business' then
    select placement, slot into v_surface, v_slot
    from public.business_promotions where id = new.campaign_id;
  elsif new.campaign_source = 'partner' then
    select surface, slot into v_surface, v_slot
    from public.partner_ad_campaigns where id = new.campaign_id;
  else
    raise exception 'INVALID_CAMPAIGN_SOURCE';
  end if;

  if not found then raise exception 'AD_CAMPAIGN_NOT_FOUND'; end if;
  if v_surface is distinct from new.surface or v_slot is distinct from new.slot then
    raise exception 'AD_DELIVERY_CONTEXT_MISMATCH';
  end if;
  return new;
end;
$function$;

drop trigger if exists ad_delivery_campaign_reference_guard on public.ad_delivery_events;
create trigger ad_delivery_campaign_reference_guard
before insert or update of campaign_source, campaign_id, surface, slot
on public.ad_delivery_events
for each row execute function public.validate_ad_delivery_campaign_reference();
