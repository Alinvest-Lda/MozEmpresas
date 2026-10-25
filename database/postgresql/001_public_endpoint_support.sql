-- Provider-neutral PostgreSQL support objects used by the public API.
-- Apply after the main MozEmpresas schema baseline has been restored.

create table if not exists public.public_rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null check (char_length(trim(email)) between 3 and 180),
  phone text,
  subject text not null check (char_length(trim(subject)) between 2 and 120),
  message text not null check (char_length(trim(message)) between 5 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists public_rate_limits_updated_at_idx
  on public.public_rate_limits (updated_at);

-- Cleanup should be scheduled by the deployment platform or a worker.
-- Do not grant anonymous direct access to either table; application writes are
-- performed by the trusted server connection using DATABASE_URL.
