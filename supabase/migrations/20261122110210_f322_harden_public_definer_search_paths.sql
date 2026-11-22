-- F3.22: harden SECURITY DEFINER search paths for public advertising and partner invite endpoints.
-- Anonymous execution remains intentional for public ad serving, interest collection and invite validation.
-- Keep pg_temp last to prevent temporary objects from shadowing trusted relations/functions.
alter function public.get_ad_decision(text,uuid,text,text,jsonb)
  set search_path = public, pg_temp;

alter function public.home_ad_slots()
  set search_path = public, pg_temp;

alter function public.record_ad_interest(text,uuid,text[],jsonb)
  set search_path = public, pg_temp;

alter function public.partner_access_validate(text)
  set search_path = public, private, pg_temp;
