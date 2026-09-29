create extension if not exists pgcrypto;

create table if not exists public.listing_attachments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  kind text not null check (kind in ('IMAGE','DOCUMENT')),
  created_at timestamptz not null default now()
);

create index if not exists listing_attachments_listing_id_idx
  on public.listing_attachments(listing_id, created_at);

alter table public.listing_attachments enable row level security;

drop policy if exists "listing attachments are publicly readable" on public.listing_attachments;
create policy "listing attachments are publicly readable"
  on public.listing_attachments for select
  using (true);

drop policy if exists "owners can add listing attachments" on public.listing_attachments;
create policy "owners can add listing attachments"
  on public.listing_attachments for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists "owners can delete listing attachments" on public.listing_attachments;
create policy "owners can delete listing attachments"
  on public.listing_attachments for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "listing media owners can upload" on storage.objects;
create policy "listing media owners can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "listing media owners can delete" on storage.objects;
create policy "listing media owners can delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
