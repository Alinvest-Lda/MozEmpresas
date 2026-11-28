-- F4.15: harden the SECURITY DEFINER bank-transfer confirmation RPC.
-- F3.92 introduced the confirmation path with a public-first search_path;
-- align it with the fixed search_path used by the other privileged payment RPCs.
alter function public.admin_confirm_partner_bank_transfer(uuid,text)
  set search_path = pg_catalog, public, pg_temp;
