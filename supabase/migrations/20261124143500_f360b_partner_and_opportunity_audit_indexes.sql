-- F3.60b: support actor-centric audit history queries and satisfy FK coverage.
create index if not exists opportunity_events_actor_created_idx
on public.opportunity_events(actor_user_id,created_at desc)
where actor_user_id is not null;
create index if not exists partner_ad_campaign_status_events_actor_created_idx
on public.partner_ad_campaign_status_events(actor_user_id,created_at desc)
where actor_user_id is not null;
create index if not exists partner_relationship_audit_actor_created_idx
on public.partner_relationship_audit(actor_user_id,created_at desc)
where actor_user_id is not null;
