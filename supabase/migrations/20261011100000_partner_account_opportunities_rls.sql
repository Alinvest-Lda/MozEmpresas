create or replace function public.current_partner_opportunity_role()
returns text
language sql
stable
security definer
set search_path = public
as $function$
  select m.role
  from public.partner_account_members m
  join public.partner_accounts a on a.id = m.account_id
  join public.profiles p on p.id = m.user_id
  where m.user_id = auth.uid()
    and m.active = true
    and a.status = 'ACTIVE'
    and p.user_type = 'parceiro'
    and coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
  order by (m.role = 'owner') desc
  limit 1
$function$;

revoke all on function public.current_partner_opportunity_role() from anon;
revoke all on function public.current_partner_opportunity_role() from public;
grant execute on function public.current_partner_opportunity_role() to authenticated;

drop policy if exists "owners manage opportunities" on public.opportunities;
drop policy if exists "published opportunities readable" on public.opportunities;

create policy "published opportunities readable by public"
on public.opportunities for select
to anon
using (status = 'PUBLISHED');

create policy "opportunities readable by authenticated users and partner account"
on public.opportunities for select
to authenticated
using (
  status = 'PUBLISHED'
  or owner_id = (select auth.uid())
  or (
    partner_account_id = public.current_partner_account_id()
    and public.current_partner_opportunity_role() is not null
  )
);

create policy "partner account managers manage opportunities"
on public.opportunities for all
to authenticated
using (
  partner_account_id = public.current_partner_account_id()
  and public.current_partner_opportunity_role() in ('owner', 'manager')
)
with check (
  partner_account_id = public.current_partner_account_id()
  and public.current_partner_opportunity_role() in ('owner', 'manager')
);

drop policy if exists "opportunity_apps_insert" on public.opportunity_applications;
drop policy if exists "opportunity_apps_read" on public.opportunity_applications;
drop policy if exists "opportunity_apps_update" on public.opportunity_applications;

create policy "opportunity applications insert by applicant during open window"
on public.opportunity_applications for insert
to authenticated
with check (
  applicant_user_id = (select auth.uid())
  and status in ('DRAFT', 'SUBMITTED')
  and exists (
    select 1 from public.opportunities o
    where o.id = opportunity_applications.opportunity_id
      and o.status = 'PUBLISHED'
      and (o.opens_at is null or o.opens_at <= now())
      and (o.closes_at is null or o.closes_at >= now())
  )
);

create policy "opportunity applications readable by applicant or partner account"
on public.opportunity_applications for select
to authenticated
using (
  applicant_user_id = (select auth.uid())
  or exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_applications.opportunity_id
      and o.partner_account_id = public.current_partner_account_id()
      and public.current_partner_opportunity_role() in ('owner', 'manager', 'analyst', 'viewer')
  )
);

create policy "partner managers update opportunity applications"
on public.opportunity_applications for update
to authenticated
using (
  exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_applications.opportunity_id
      and o.partner_account_id = public.current_partner_account_id()
      and public.current_partner_opportunity_role() in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_applications.opportunity_id
      and o.partner_account_id = public.current_partner_account_id()
      and public.current_partner_opportunity_role() in ('owner', 'manager')
  )
);

create policy "applicants may update own application before final review"
on public.opportunity_applications for update
to authenticated
using (
  applicant_user_id = (select auth.uid())
  and status in ('DRAFT', 'SUBMITTED')
)
with check (
  applicant_user_id = (select auth.uid())
  and status in ('DRAFT', 'SUBMITTED', 'WITHDRAWN')
  and exists (
    select 1 from public.opportunities o
    where o.id = opportunity_applications.opportunity_id
      and o.status = 'PUBLISHED'
      and (o.opens_at is null or o.opens_at <= now())
      and (o.closes_at is null or o.closes_at >= now() or opportunity_applications.status = 'WITHDRAWN')
  )
);
