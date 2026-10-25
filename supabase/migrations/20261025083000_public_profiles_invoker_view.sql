-- Use invoker permissions for the public profile view; allow anonymous reads
-- only for public columns and active profiles.
revoke all on table public.profiles from anon;
grant select (id, full_name, location, website, bio, created_at) on public.profiles to anon;

drop policy if exists profiles_public_read_active on public.profiles;
create policy profiles_public_read_active
on public.profiles
for select
to anon
using (account_status = 'ACTIVE');

create or replace view public.public_profiles
with (security_invoker = true)
as
select id, full_name, location, website, bio, created_at
from public.profiles
where account_status = 'ACTIVE';

revoke all on public.public_profiles from public, anon, authenticated, service_role;
grant select on public.public_profiles to anon, authenticated;
