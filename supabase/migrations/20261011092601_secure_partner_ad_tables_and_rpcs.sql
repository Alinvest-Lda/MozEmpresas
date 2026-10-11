alter table public.partner_entitlements enable row level security;
alter table public.partner_ad_products enable row level security;
alter table public.partner_ad_campaigns enable row level security;
alter table public.partner_ad_targets enable row level security;

drop policy if exists "active partner ad products are readable" on public.partner_ad_products;
create policy "active partner ad products are readable" on public.partner_ad_products for select to anon, authenticated using (active = true);
drop policy if exists "platform admins manage partner ad products" on public.partner_ad_products;
create policy "platform admins manage partner ad products" on public.partner_ad_products for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "partner accounts read own ad campaigns" on public.partner_ad_campaigns;
create policy "partner accounts read own ad campaigns" on public.partner_ad_campaigns for select to authenticated using (account_id = (select public.current_partner_account_id()));
drop policy if exists "platform admins manage partner ad campaigns" on public.partner_ad_campaigns;
create policy "platform admins manage partner ad campaigns" on public.partner_ad_campaigns for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "partner accounts read own ad targets" on public.partner_ad_targets;
create policy "partner accounts read own ad targets" on public.partner_ad_targets for select to authenticated using (exists (select 1 from public.partner_ad_campaigns c where c.id = partner_ad_targets.campaign_id and c.account_id = (select public.current_partner_account_id())));
drop policy if exists "platform admins manage partner ad targets" on public.partner_ad_targets;
create policy "platform admins manage partner ad targets" on public.partner_ad_targets for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "partner accounts read own entitlements" on public.partner_entitlements;
create policy "partner accounts read own entitlements" on public.partner_entitlements for select to authenticated using (account_id = (select public.current_partner_account_id()));
drop policy if exists "platform admins manage partner entitlements" on public.partner_entitlements;
create policy "platform admins manage partner entitlements" on public.partner_entitlements for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

revoke all on function public.business_ad_campaign_metrics() from anon;
grant execute on function public.business_ad_campaign_metrics() to authenticated;
revoke all on function public.partner_ad_campaign_metrics() from anon;
grant execute on function public.partner_ad_campaign_metrics() to authenticated;
revoke all on function public.partner_access_claim(text, uuid) from anon;
grant execute on function public.partner_access_claim(text, uuid) to authenticated;
