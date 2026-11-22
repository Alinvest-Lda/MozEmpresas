-- F3.25d: scope partner financial read access to active members of the owning account.
drop policy if exists "partner members read own financial documents" on public.financial_documents;
create policy "partner members read own financial documents"
on public.financial_documents for select to authenticated
using (
  partner_account_id is not null and exists(
    select 1 from public.partner_account_members m
    where m.account_id=financial_documents.partner_account_id and m.user_id=(select auth.uid()) and m.active=true
  )
  or exists(select 1 from public.platform_members pm
    where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin')
);
drop policy if exists "partner members read own financial payments" on public.financial_payments;
create policy "partner members read own financial payments"
on public.financial_payments for select to authenticated
using (
  partner_account_id is not null and exists(
    select 1 from public.partner_account_members m
    where m.account_id=financial_payments.partner_account_id and m.user_id=(select auth.uid()) and m.active=true
  )
  or exists(select 1 from public.platform_members pm
    where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin')
);
