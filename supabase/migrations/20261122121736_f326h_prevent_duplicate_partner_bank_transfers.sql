create unique index if not exists financial_payments_partner_bank_reference_uidx
on public.financial_payments(partner_account_id,reference)
where method='BANK_TRANSFER' and reference is not null and partner_account_id is not null;