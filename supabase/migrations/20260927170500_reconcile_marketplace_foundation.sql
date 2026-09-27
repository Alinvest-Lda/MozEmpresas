-- Reconcile the current marketplace foundation with the unified account model.
-- Accounts are not classified as buyer/seller. Capabilities are granted through
-- business membership and, separately, platform access.

alter table public.businesses add column if not exists cover_url text;

alter table public.business_members drop constraint if exists business_members_role_check;
alter table public.business_members add constraint business_members_role_check
  check (role in ('owner','admin','operator','member','viewer'));

create table if not exists public.platform_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_business_idx on public.listings(business_id);
create index if not exists opportunities_owner_idx on public.opportunities(owner_id);
create index if not exists business_members_user_idx on public.business_members(user_id);

alter table public.platform_members enable row level security;

grant select on public.platform_members to authenticated;

drop policy if exists "platform members read own access" on public.platform_members;
create policy "platform members read own access"
  on public.platform_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The legacy profiles.user_type field is intentionally retained for backwards
-- compatibility with existing data. It is no longer used for authentication,
-- authorization or product capability decisions. A future cleanup migration
-- may remove it after all deployments have migrated away from it.
