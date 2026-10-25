-- Keep the public profile view strictly read-only for all API roles.
revoke all on public.public_profiles from public, anon, authenticated, service_role;
grant select on public.public_profiles to anon, authenticated;
