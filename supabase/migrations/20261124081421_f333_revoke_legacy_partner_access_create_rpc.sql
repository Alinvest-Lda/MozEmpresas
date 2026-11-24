revoke execute on function public.partner_access_create(text,text,timestamp with time zone) from public, anon, authenticated;
grant execute on function public.partner_access_create(text,text,timestamp with time zone) to service_role;
