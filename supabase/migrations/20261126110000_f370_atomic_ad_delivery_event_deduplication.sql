-- F3.70: serialize click attribution and deduplication in the database.
-- The API still performs campaign eligibility checks; this function atomically
-- enforces impression-before-click and suppresses repeated clicks per visitor/campaign/slot.
create or replace function public.record_ad_delivery_event_f370(
  p_visitor_key text,
  p_user_id uuid,
  p_campaign_source text,
  p_campaign_id uuid,
  p_surface text,
  p_slot text,
  p_event_type text,
  p_context jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_lock_key text;
begin
  if p_visitor_key is null or length(p_visitor_key) not between 16 and 200
    or p_campaign_source not in ('business','partner')
    or p_campaign_id is null
    or nullif(btrim(p_surface),'') is null
    or nullif(btrim(p_slot),'') is null
    or p_event_type not in ('IMPRESSION','CLICK')
    or coalesce(jsonb_typeof(p_context),'null') <> 'object' then
    raise exception 'INVALID_AD_DELIVERY_EVENT' using errcode='22023';
  end if;

  v_lock_key := p_visitor_key || ':' || p_campaign_source || ':' || p_campaign_id::text || ':' || p_surface || ':' || p_slot;
  perform pg_advisory_xact_lock(hashtextextended(v_lock_key, 0));

  if p_event_type = 'CLICK' then
    if not exists (
      select 1 from public.ad_delivery_events e
      where e.visitor_key = p_visitor_key
        and e.campaign_source = p_campaign_source
        and e.campaign_id = p_campaign_id
        and e.surface = p_surface
        and e.slot = p_slot
        and e.event_type = 'IMPRESSION'
        and e.created_at >= v_now - interval '24 hours'
    ) then
      raise exception 'AD_CLICK_WITHOUT_IMPRESSION' using errcode='23514';
    end if;

    if exists (
      select 1 from public.ad_delivery_events e
      where e.visitor_key = p_visitor_key
        and e.campaign_source = p_campaign_source
        and e.campaign_id = p_campaign_id
        and e.surface = p_surface
        and e.slot = p_slot
        and e.event_type = 'CLICK'
        and e.created_at >= v_now - interval '30 seconds'
    ) then
      return false;
    end if;
  end if;

  insert into public.ad_delivery_events (
    visitor_key, user_id, campaign_source, campaign_id, surface, slot, event_type, context
  ) values (
    p_visitor_key, p_user_id, p_campaign_source, p_campaign_id, p_surface, p_slot, p_event_type, p_context
  );
  return true;
end;
$function$;

revoke all on function public.record_ad_delivery_event_f370(text,uuid,text,uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_ad_delivery_event_f370(text,uuid,text,uuid,text,text,text,jsonb) to service_role;
