-- Least-privilege grants for the application role used by DATABASE_URL.
-- Create the login role out-of-band with a strong secret before applying this file.
grant usage on schema public to mozempresas_app;
grant select, insert, update on table public.public_rate_limits to mozempresas_app;
grant insert on table public.contact_messages to mozempresas_app;
grant insert on table public.ad_delivery_events to mozempresas_app;
grant insert on table public.advertising_requests to mozempresas_app;
