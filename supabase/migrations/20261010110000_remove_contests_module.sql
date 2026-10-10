-- Remove the contests feature from MozEmpresas.
-- Preserve opportunity attachment permissions; remove only their contest branch.
drop policy if exists "owners can add publication attachments" on public.publication_attachments;
create policy "owners can add publication attachments"
on public.publication_attachments for insert to authenticated
with check (
  resource_type = 'OPPORTUNITY'
  and exists (
    select 1 from public.opportunities o
    where o.id = publication_attachments.resource_id
      and o.owner_id = (select auth.uid())
  )
);

drop policy if exists "owners can delete publication attachments" on public.publication_attachments;
create policy "owners can delete publication attachments"
on public.publication_attachments for delete to authenticated
using (
  resource_type = 'OPPORTUNITY'
  and exists (
    select 1 from public.opportunities o
    where o.id = publication_attachments.resource_id
      and o.owner_id = (select auth.uid())
  )
);

delete from public.platform_services
where slug in ('concursos-empresariais', 'monitoria-concursos-oportunidades');

drop table if exists public.contest_evaluations;
drop table if exists public.contest_evaluators;
drop table if exists public.contest_evaluation_criteria;
drop table if exists public.contest_requirements;
drop table if exists public.contest_applications;
drop table if exists public.contests;

drop type if exists public.contest_status;
