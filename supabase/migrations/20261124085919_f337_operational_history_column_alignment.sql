-- F3.37 alignment: preserve the original event payload columns while adding typed fields
-- used by the application audit views and database capture triggers.
alter table public.support_ticket_events
  add column if not exists old_status text,
  add column if not exists new_status text,
  add column if not exists old_priority text,
  add column if not exists new_priority text,
  add column if not exists old_assigned_to uuid,
  add column if not exists new_assigned_to uuid;

alter table public.opportunity_application_events
  add column if not exists event_type text,
  add column if not exists old_status text;

update public.opportunity_application_events
set old_status = previous_status
where old_status is null and previous_status is not null;

update public.opportunity_application_events
set event_type = case when old_status is null then 'SUBMITTED' else 'STATUS_CHANGED' end
where event_type is null;

alter table public.opportunity_application_events alter column event_type set not null;
alter table public.opportunity_application_events
  add constraint opportunity_application_events_event_type_check
  check (event_type in ('SUBMITTED','STATUS_CHANGED'));
