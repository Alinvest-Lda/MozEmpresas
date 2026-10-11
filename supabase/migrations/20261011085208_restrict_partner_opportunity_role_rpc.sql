revoke all on function public.current_partner_opportunity_role() from anon;
revoke all on function public.current_partner_opportunity_role() from public;
grant execute on function public.current_partner_opportunity_role() to authenticated;