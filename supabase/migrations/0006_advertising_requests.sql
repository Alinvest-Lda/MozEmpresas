create table public.advertising_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  placement text not null check (placement in ('DIRECTORY_BILLBOARD','DIRECTORY_FEATURED','DIRECTORY_SIDEBAR','DIRECTORY_INFEED')),
  package_name text not null,
  starts_at date,
  ends_at date,
  message text,
  status text not null default 'NEW' check (status in ('NEW','CONTACTED','PROPOSAL','AWAITING_PAYMENT','PAID','APPROVED','REJECTED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advertising_requests_status_idx on public.advertising_requests(status, created_at desc);
create index advertising_requests_business_idx on public.advertising_requests(business_id);

alter table public.advertising_requests enable row level security;

grant insert on public.advertising_requests to anon, authenticated;

create policy "public can request advertising"
  on public.advertising_requests
  for insert
  to anon, authenticated
  with check (true);
