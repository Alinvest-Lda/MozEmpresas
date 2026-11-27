-- F3.94: retain the hardened catalog-first search path on the bank-transfer settlement RPC.
alter function public.admin_confirm_partner_bank_transfer(uuid,text)
  set search_path = pg_catalog, public, pg_temp;
