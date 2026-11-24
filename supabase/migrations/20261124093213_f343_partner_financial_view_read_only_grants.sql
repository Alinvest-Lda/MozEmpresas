-- F3.43: partner financial summary is an authenticated, read-only reporting view.
-- It is a security-invoker view; underlying RLS policies remain authoritative.
revoke all privileges on table public.partner_contract_financial_summary from anon;
revoke insert, update, delete, truncate, references, trigger, maintain
  on table public.partner_contract_financial_summary from authenticated;
grant select on table public.partner_contract_financial_summary to authenticated;
