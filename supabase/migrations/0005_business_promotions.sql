create table public.business_promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  placement text not null check (placement in ('DIRECTORY_BILLBOARD','DIRECTORY_FEATURED','DIRECTORY_SIDEBAR','DIRECTORY_INFEED')),
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','PAUSED','EXPIRED','CANCELLED')),
  title text not null,
  text text,
  image_url text,
  target_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  priority integer not null default 0,
  price_mzn numeric(14,2),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_promotions_dates check (ends_at > starts_at)
);

create index business_promotions_active_idx
  on public.business_promotions(placement, status, starts_at, ends_at, priority desc);

create index business_promotions_business_idx
  on public.business_promotions(business_id);

alter table public.business_promotions enable row level security;

grant select on public.business_promotions to anon, authenticated;
grant insert, update, delete on public.business_promotions to authenticated;

create policy "active business promotions are readable"
  on public.business_promotions
  for select
  to anon, authenticated
  using (
    status = 'ACTIVE'
    and starts_at <= now()
    and ends_at > now()
  );

create policy "owners manage own business promotions"
  on public.business_promotions
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
    )
  );