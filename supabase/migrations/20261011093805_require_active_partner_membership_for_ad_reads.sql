drop policy if exists "partner accounts read own ad campaigns" on public.partner_ad_campaigns;
create policy "partner accounts read own ad campaigns" on public.partner_ad_campaigns for select to authenticated
using (account_id = (select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null);

drop policy if exists "partner accounts read own ad targets" on public.partner_ad_targets;
create policy "partner accounts read own ad targets" on public.partner_ad_targets for select to authenticated
using (
  public.current_partner_opportunity_role() is not null
  and exists (
    select 1 from public.partner_ad_campaigns c
    where c.id = partner_ad_targets.campaign_id
      and c.account_id = (select public.current_partner_account_id())
  )
);

drop policy if exists "partner accounts read own entitlements" on public.partner_entitlements;
create policy "partner accounts read own entitlements" on public.partner_entitlements for select to authenticated
using (account_id = (select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null);