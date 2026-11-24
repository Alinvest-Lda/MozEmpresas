-- F3.39: remove redundant indexes and cover actor foreign keys for audit streams.
create index if not exists support_ticket_events_actor_created_idx
  on public.support_ticket_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

create index if not exists opportunity_application_events_actor_created_idx
  on public.opportunity_application_events(actor_user_id, created_at desc)
  where actor_user_id is not null;

drop index if exists public.business_members_user_id_idx;
drop index if exists public.idx_order_events_order;
