-- MozEmpresas phase 2 access hardening
-- Public visitors see only open contests and advertising. Marketplace listings are member-only.

drop policy if exists "published listings are readable" on public.listings;
create policy "published listings are member readable"
  on public.listings for select
  to authenticated
  using (status = 'PUBLISHED' or owner_id = (select auth.uid()));

drop policy if exists "listing media readable" on public.listing_media;
create policy "listing media member readable"
  on public.listing_media for select
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'PUBLISHED' or l.owner_id = (select auth.uid()))
    )
  );

drop policy if exists "published contests readable" on public.contests;
create policy "open contests public readable"
  on public.contests for select
  to anon, authenticated
  using (status = 'OPEN' or owner_id = (select auth.uid()));

drop policy if exists "contest requirements readable" on public.contest_requirements;
create policy "open contest requirements member readable"
  on public.contest_requirements for select
  to authenticated
  using (
    exists (
      select 1 from public.contests c
      where c.id = contest_id
        and (c.status = 'OPEN' or c.owner_id = (select auth.uid()))
    )
  );

-- Keep public preview limited to the contest record itself. Applications,
-- answers, documents, evaluations and results remain authenticated/internal.
-- Future benefit modules can attach to opportunity_applications without
-- exposing application data to anonymous visitors.

create index if not exists contests_public_open_idx
  on public.contests(status, closes_at, created_at desc);

create index if not exists business_promotions_public_idx
  on public.business_promotions(placement, status, starts_at, ends_at, priority desc);


-- Tighten application ownership so applicants cannot self-edit workflow status.
drop policy if exists "applicants manage own applications" on public.contest_applications;
create policy "applicants read own contest applications"
  on public.contest_applications for select to authenticated
  using ((select auth.uid()) = applicant_id);
create policy "applicants create contest applications"
  on public.contest_applications for insert to authenticated
  with check ((select auth.uid()) = applicant_id);
create policy "applicants delete own contest applications"
  on public.contest_applications for delete to authenticated
  using ((select auth.uid()) = applicant_id);

drop policy if exists "contest owners read applications" on public.contest_applications;
create policy "contest owners read applications"
  on public.contest_applications for select to authenticated
  using (exists(select 1 from public.contests c where c.id = contest_id and c.owner_id = (select auth.uid())));

-- Trigger functions are internal implementation details, not public API endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;


revoke select on public.listings, public.listing_media from anon;
revoke select on public.contest_requirements from anon;

-- Release boundary: application access rules are intentionally prepared for the next platform modules.
