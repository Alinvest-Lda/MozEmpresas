-- F3.40: keep the support event constraint aligned with the unassignment transition.
alter table public.support_ticket_events
  drop constraint if exists support_ticket_events_event_type_check;

alter table public.support_ticket_events
  add constraint support_ticket_events_event_type_check
  check (event_type in ('CREATED','STATUS_CHANGED','PRIORITY_CHANGED','ASSIGNED','UNASSIGNED'));
