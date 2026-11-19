-- Permit active Super Admins to inspect immutable service adjustment history.
drop policy if exists "super admins read service adjustments" on public.platform_service_adjustments;
create policy "super admins read service adjustments" on public.platform_service_adjustments for select to authenticated
using (exists(select 1 from public.platform_members pm where pm.user_id=(select auth.uid()) and pm.active=true and pm.role='super_admin'));
