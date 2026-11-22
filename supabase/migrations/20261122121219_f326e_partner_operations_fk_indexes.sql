
create index if not exists financial_documents_issued_by_internal_user_idx on public.financial_documents(issued_by_internal_user_id);
create index if not exists financial_payments_verified_by_idx on public.financial_payments(verified_by);
create index if not exists partner_contacts_created_by_idx on public.partner_contacts(created_by);
create index if not exists partner_contracts_created_by_idx on public.partner_contracts(created_by);
create index if not exists partner_contracts_approved_by_idx on public.partner_contracts(approved_by);
create index if not exists partner_report_deliveries_campaign_idx on public.partner_report_deliveries(campaign_id);
create index if not exists partner_report_deliveries_contract_idx on public.partner_report_deliveries(contract_id);
create index if not exists partner_report_deliveries_created_by_idx on public.partner_report_deliveries(created_by);
create index if not exists partner_report_deliveries_delivered_by_idx on public.partner_report_deliveries(delivered_by);
create index if not exists partner_service_engagements_operations_user_idx on public.partner_service_engagements(assigned_operations_user_id);
create index if not exists partner_service_engagements_campaign_idx on public.partner_service_engagements(campaign_id);
create index if not exists partner_service_engagements_created_by_idx on public.partner_service_engagements(created_by);
