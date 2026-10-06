alter table public.platform_members drop constraint if exists platform_members_role_check;

alter table public.platform_members
  add constraint platform_members_role_check
  check (role = any (array['admin'::text, 'operator'::text, 'super_admin'::text]));
