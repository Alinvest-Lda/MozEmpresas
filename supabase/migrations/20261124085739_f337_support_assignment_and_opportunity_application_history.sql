-- F3.37 baseline: support assignment and first-generation operational history.
alter table public.support_tickets
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('CREATED','STATUS_CHANGED','ASSIGNED','PRIORITY_CHANGED')),
  previous_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.opportunity_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  previous_status text,
  new_status text not null,
  created_at timestamptz not null default now()
);

alter table public.support_ticket_events enable row level security;
alter table public.opportunity_application_events enable row level security;
