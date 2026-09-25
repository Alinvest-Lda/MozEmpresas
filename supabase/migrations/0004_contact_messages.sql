create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
grant insert on public.contact_messages to anon, authenticated;
create policy "public can submit contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);
