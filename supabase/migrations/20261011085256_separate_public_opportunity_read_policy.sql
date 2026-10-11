drop policy if exists "opportunities readable by public or partner account" on public.opportunities;

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