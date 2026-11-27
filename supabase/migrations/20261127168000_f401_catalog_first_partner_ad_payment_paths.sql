-- F4.01: make catalog-first resolution explicit on privileged partner advertising payment routines.
alter function public.admin_issue_partner_ad_payment(uuid,text,numeric)
  set search_path = pg_catalog, public, pg_temp;
alter function public.confirm_mpesa_partner_ad_payment(text,text,numeric,text)
  set search_path = pg_catalog, public, pg_temp;
alter function public.fail_mpesa_partner_ad_payment(text,text,numeric,text)
  set search_path = pg_catalog, public, pg_temp;
