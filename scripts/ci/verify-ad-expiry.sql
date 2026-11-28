-- Verify F3.76 idempotent expiry boundaries and reported counters.
do $verify$
declare
  result jsonb;
begin
  result:=public.reconcile_advertising_campaign_expiry_f376();
  if (result->>'business_promotions_expired')::integer<>1 then
    raise exception 'Expected exactly one expired business promotion, got %',result;
  end if;
  if (result->>'partner_campaigns_ended')::integer<>2 then
    raise exception 'Expected active and paused partner campaigns to end, got %',result;
  end if;
  if not exists(select 1 from public.business_promotions where id='76000000-0000-4000-8000-000000000001' and status='EXPIRED') then
    raise exception 'Expired business promotion was not reconciled';
  end if;
  if not exists(select 1 from public.business_promotions where id='76000000-0000-4000-8000-000000000002' and status='ACTIVE') then
    raise exception 'Future business promotion was expired early';
  end if;
  if not exists(select 1 from public.business_promotions where id='76000000-0000-4000-8000-000000000003' and status='EXPIRED') then
    raise exception 'Already expired business promotion changed unexpectedly';
  end if;
  if not exists(select 1 from public.partner_ad_campaigns where id='76100000-0000-4000-8000-000000000001' and status='ENDED') then
    raise exception 'Expired active partner campaign was not ended';
  end if;
  if not exists(select 1 from public.partner_ad_campaigns where id='76100000-0000-4000-8000-000000000002' and status='ENDED') then
    raise exception 'Expired paused partner campaign was not ended';
  end if;
  if not exists(select 1 from public.partner_ad_campaigns where id='76100000-0000-4000-8000-000000000003' and status='ACTIVE') then
    raise exception 'Future partner campaign was ended early';
  end if;
  if not exists(select 1 from public.partner_ad_campaigns where id='76100000-0000-4000-8000-000000000004' and status='ENDED') then
    raise exception 'Already ended partner campaign changed unexpectedly';
  end if;
  -- A second execution must be idempotent and report no additional transitions.
  result:=public.reconcile_advertising_campaign_expiry_f376();
  if (result->>'business_promotions_expired')::integer<>0 or
     (result->>'partner_campaigns_ended')::integer<>0 then
    raise exception 'Reconciliation is not idempotent: %',result;
  end if;
end
$verify$;
