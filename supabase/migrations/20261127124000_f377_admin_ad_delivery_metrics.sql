-- F3.77: authoritative campaign-level advertising metrics from immutable delivery events.
create index if not exists ad_delivery_campaign_metrics_idx
  on public.ad_delivery_events(campaign_source,campaign_id,event_type,created_at desc);

create or replace function public.admin_advertising_delivery_metrics_f377(
  p_business_campaign_ids uuid[] default '{}',
  p_partner_campaign_ids uuid[] default '{}'
) returns table(
  campaign_source text,
  campaign_id uuid,
  impressions_count bigint,
  clicks_count bigint,
  last_event_at timestamptz
)
language plpgsql
stable
security definer
set search_path=pg_catalog,public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'FORBIDDEN' using errcode='42501';
  end if;
  if coalesce(cardinality(p_business_campaign_ids),0)>500
    or coalesce(cardinality(p_partner_campaign_ids),0)>500 then
    raise exception 'TOO_MANY_CAMPAIGN_IDS' using errcode='22023';
  end if;

  return query
  select e.campaign_source,e.campaign_id,
    count(*) filter(where e.event_type='IMPRESSION')::bigint,
    count(*) filter(where e.event_type='CLICK')::bigint,
    max(e.created_at)
  from public.ad_delivery_events e
  where (e.campaign_source='business' and e.campaign_id=any(coalesce(p_business_campaign_ids,'{}'::uuid[])))
     or (e.campaign_source='partner' and e.campaign_id=any(coalesce(p_partner_campaign_ids,'{}'::uuid[])))
  group by e.campaign_source,e.campaign_id;
end;
$$;
revoke all on function public.admin_advertising_delivery_metrics_f377(uuid[],uuid[]) from public,anon;
grant execute on function public.admin_advertising_delivery_metrics_f377(uuid[],uuid[]) to authenticated;
