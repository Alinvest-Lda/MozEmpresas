-- The public contact API already writes this shape; restore the missing table
-- and keep submissions server-only so the API rate limiter cannot be bypassed.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 3 and 180),
  phone text,
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  message text not null check (char_length(trim(message)) between 5 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from public, anon, authenticated;
grant insert on table public.contact_messages to service_role;
