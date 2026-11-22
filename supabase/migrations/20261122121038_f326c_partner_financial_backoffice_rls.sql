
drop policy if exists partner_admin_manage_financial_documents_f326 on public.financial_documents;
create policy partner_admin_manage_financial_documents_f326 on public.financial_documents for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists partner_admin_manage_financial_payments_f326 on public.financial_payments;
create policy partner_admin_manage_financial_payments_f326 on public.financial_payments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create index if not exists partner_contacts_account_idx on public.partner_contacts(account_id);
create index if not exists partner_contracts_account_created_idx on public.partner_contracts(account_id,created_at desc);
create index if not exists partner_reports_account_created_idx on public.partner_report_deliveries(account_id,created_at desc);
grant select,insert,update on public.financial_documents to authenticated;
grant select,insert,update on public.financial_payments to authenticated;
