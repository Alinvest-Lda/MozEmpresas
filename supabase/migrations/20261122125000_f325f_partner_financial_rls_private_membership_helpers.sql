-- F3.25f: use trusted SECURITY DEFINER membership helpers inside partner-owned RLS predicates.
drop policy if exists "partner ad payment order owner read" on public.partner_ad_payment_orders;
create policy "partner ad payment order owner read" on public.partner_ad_payment_orders for select to authenticated
using ((account_id=(select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null) or public.is_super_admin());
drop policy if exists "partner members read own financial documents" on public.financial_documents;
create policy "partner members read own financial documents" on public.financial_documents for select to authenticated
using ((partner_account_id=(select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null) or public.is_super_admin());
drop policy if exists "partner members read own financial payments" on public.financial_payments;
create policy "partner members read own financial payments" on public.financial_payments for select to authenticated
using ((partner_account_id=(select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null) or public.is_super_admin());
drop policy if exists "partner members read own ad payment adjustments" on public.partner_ad_payment_adjustments;
create policy "partner members read own ad payment adjustments" on public.partner_ad_payment_adjustments for select to authenticated
using ((account_id=(select public.current_partner_account_id()) and public.current_partner_opportunity_role() is not null) or public.is_super_admin());
