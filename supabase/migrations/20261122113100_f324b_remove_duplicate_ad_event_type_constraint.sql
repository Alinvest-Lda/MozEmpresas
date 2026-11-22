-- F3.24b: no-op compatibility migration. The deployed database retains one validated
-- event_type constraint; this migration documents cleanup of the earlier duplicate name.
alter table public.ad_delivery_events
  drop constraint if exists ad_delivery_events_type_check;
