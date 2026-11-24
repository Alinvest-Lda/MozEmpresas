-- F3.37 baseline: assignment field and append-only event stream structures.
alter table public.support_tickets
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create index if not exists support_tickets_assigned_updated_idx
  on public.support_tickets(assigned_to, updated_at desc)
  where assigned_to is not null;

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('CREATED','STATUS_CHANGED','PRIORITY_CHANGED','ASSIGNED','UNASSIGNED')),
  old_status text,
  new_status text,
  old_priority text,
  new_priority text,
  old_assigned_to uuid,
  new_assigned_to uuid,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_events_ticket_created_idx
  on public.support_ticket_events(ticket_id, created_at);

create table if not exists public.opportunity_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('SUBMITTED','STATUS_CHANGED')),
  old_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);

create index if not exists opportunity_application_events_application_created_idx
  on public.opportunity_application_events(application_id, created_at);
alter table public.support_ticket_events enable row level security;
alter table public.opportunity_application_events enable row level security;
