-- Public company portfolio media used by directory and company profiles.
create table if not exists public.business_portfolio_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url text not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists business_portfolio_media_business_idx on public.business_portfolio_media(business_id,sort_order);
alter table public.business_portfolio_media enable row level security;
drop policy if exists "public can read business portfolio" on public.business_portfolio_media;
create policy "public can read business portfolio" on public.business_portfolio_media for select to anon,authenticated using (
  exists(select 1 from public.businesses b where b.id=business_id and b.is_public=true)
);
drop policy if exists "business owners manage portfolio" on public.business_portfolio_media;
create policy "business owners manage portfolio" on public.business_portfolio_media for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
) with check (
  exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
);
grant select on public.business_portfolio_media to anon,authenticated;
grant insert,update,delete on public.business_portfolio_media to authenticated;