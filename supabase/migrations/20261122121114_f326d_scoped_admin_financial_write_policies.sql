
drop policy if exists partner_admin_manage_financial_documents_f326 on public.financial_documents;
drop policy if exists partner_admin_manage_financial_payments_f326 on public.financial_payments;
create policy partner_admin_insert_financial_documents_f326 on public.financial_documents for insert to authenticated with check(public.is_super_admin());
create policy partner_admin_update_financial_documents_f326 on public.financial_documents for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy partner_admin_delete_financial_documents_f326 on public.financial_documents for delete to authenticated using(public.is_super_admin());
create policy partner_admin_insert_financial_payments_f326 on public.financial_payments for insert to authenticated with check(public.is_super_admin());
create policy partner_admin_update_financial_payments_f326 on public.financial_payments for update to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy partner_admin_delete_financial_payments_f326 on public.financial_payments for delete to authenticated using(public.is_super_admin());
