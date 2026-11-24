-- F3.37: allow active partner-account members to read the audit history
-- of applications submitted to opportunities owned by their partner account.
drop policy if exists "opportunity application events participant read" on public.opportunity_application_events;
create policy "opportunity application events participant read"
on public.opportunity_application_events for select to authenticated using (
  exists (
    select 1
    from public.opportunity_applications a
    join public.opportunities o on o.id = a.opportunity_id
    where a.id = opportunity_application_events.application_id
      and (
        a.applicant_user_id = (select auth.uid())
        or o.owner_id = (select auth.uid())
        or (
          o.partner_account_id is not null
          and o.partner_account_id = public.current_partner_account_id()
        )
        or exists (
          select 1 from public.platform_members pm
          where pm.user_id = (select auth.uid()) and pm.active = true and pm.role = 'super_admin'
        )
      )
  )
);
