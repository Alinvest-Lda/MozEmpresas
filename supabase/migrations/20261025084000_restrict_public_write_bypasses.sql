-- Force public writes through rate-limited server routes rather than direct PostgREST inserts.
revoke insert on table public.ad_delivery_events from anon, authenticated;
revoke insert on table public.advertising_requests from anon, authenticated;
revoke insert on table public.contact_messages from anon, authenticated;
grant insert on table public.ad_delivery_events to service_role;
grant insert on table public.advertising_requests to service_role;
grant insert on table public.contact_messages to service_role;
